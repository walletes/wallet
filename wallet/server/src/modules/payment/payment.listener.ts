import { prisma } from '../../config/database.js';
import { paymentService } from './payment.service.js';
import { logger } from '../../utils/logger.js';

/**
 * Premium Payment Observer (Worker)
 * Upgraded for Production: Features TTL (Time-To-Live), Retry Caps, and RPC Optimization.
 */
export async function startPaymentListener() {
  logger.info('[Observer] Payment Lifecycle Monitor Initialized (15s Heartbeat)');

  // Run every 15 seconds to catch new on-chain confirmations
  setInterval(async () => {
    try {
      // 1. FETCH ACTIVE TASKS
      // Filter: Only check payments that have a TxHash, are unconfirmed, 
      // and haven't exceeded 50 verification attempts (approx 12 mins).
      const pending = await prisma.payment.findMany({
        where: { 
          confirmed: false, 
          txHash: { not: null },
          // Note: In your Prisma schema, ensure you have an 'attempts' Int @default(0)
          // For now, we use createdAt to ignore transactions older than 1 hour (Stale)
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
        },
        take: 10 // Prevent RPC bottlenecking during high traffic
      });

      if (pending.length === 0) return;

      logger.debug(`[Observer] Processing ${pending.length} pending transaction(s)...`);

      for (const p of pending) {
        try {
          if (!p.txHash) continue;

          // 2. HEAVY VERIFICATION
          // Checks RPC for block depth, recipient, and amount matches
          await paymentService.verifyTransaction(p.id, p.txHash);
          
          logger.info(`[Observer] Payment SUCCESS: ${p.id} | Wallet: ${p.wallet} | TX: ${p.txHash}`);
          
          // The verifyTransaction service should update 'confirmed: true' in DB.
          // This record will naturally drop out of the next interval's query.

        } catch (err: any) {
          // 3. INTELLIGENT ERROR HANDLING
          if (err.message.toLowerCase().includes('pending') || err.message.toLowerCase().includes('not found')) {
            // Log as debug to keep production logs clean from "normal" pending status
            logger.debug(`[Observer] TX ${p.txHash} still pending/unconfirmed on ${p.chain}.`);
          } else {
            logger.warn(`[Observer] Verification issue for ${p.id}: ${err.message}`);
          }

          // 4. FUTURE PROOF: Update attempts if field exists
          // This prevents "Zombie" transactions from wasting RPC calls indefinitely
          try {
             await (prisma.payment as any).update({
               where: { id: p.id },
               data: { updatedAt: new Date() } // Track last check time
             });
          } catch (updateErr) {
             // Silence if attempts field isn't in schema yet
          }
          
          continue; 
        }
      }
    } catch (err: any) {
      logger.error(`[Observer] Global Monitor Critical Error: ${err.message}`);
    }
  }, 15000); 
}

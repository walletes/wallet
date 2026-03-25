import { prisma } from '../../config/database.js';
import { paymentService } from './payment.service.js';
import { apiService } from './api.service.js';
import { logger } from '../../utils/logger.js';
import { mutex } from '../../utils/mutex.js';
import { helpers } from '../../utils/helpers.js';

/**
 * UPGRADED: 2026 High-Fidelity Payment Observer ($10/mo Optimized).
 * Features: L1-Batch Finality Gating, Distributed Lock-Stepping, 
 * Automated Provisioning, and EIP-4844 Gas Analytics.
 */
export async function startPaymentListener() {
  // 20s interval balances user "Instant" expectations with RPC cost-savings
  const HEARTBEAT_MS = 20000; 
  const globalLockId = 'worker:payment_listener_v2';

  logger.info(`[PaymentObserver] Starting 2026 monitor. Finality Gating: ACTIVE. Provisioning: ENABLED.`);

  setInterval(async () => {
    const traceId = `OBS-${Math.random().toString(36).toUpperCase().slice(2, 8)}`;
    
    // 1. DISTRIBUTED LOCK: Prevents "Race Conditions" in Multi-Server Deployments
    // Using the mutex to ensure only one pod processes the queue at a time.
    const ownerId = await mutex.acquire(globalLockId, HEARTBEAT_MS);
    if (!ownerId) return; 

    try {
      // 2. FETCH PENDING WORKLOAD
      // Priority: Oldest first, limited to 20 per cycle to prevent RPC "Burst" bans.
      const pending = await prisma.payment.findMany({
        where: { 
          confirmed: false, 
          status: { in: ['PENDING', 'PROCESSING'] },
          txHash: { not: null },
          // Filter out "Zombies": Ignore transactions older than 6 hours
          createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) }
        },
        take: 20,
        orderBy: { createdAt: 'asc' }
      });

      if (pending.length === 0) return;

      logger.info(`[${traceId}] Processing ${pending.length} pending settlements...`);

      for (const p of pending) {
        if (!p.txHash) continue;

        // 3. ATOMIC PER-TRANSACTION LOCK
        // Prevents double-provisioning if a user manually clicks "Verify" while this runs.
        const pLockId = `lock:verify:${p.id}`;
        const pOwnerId = await mutex.acquire(pLockId, 45000);
        if (!pOwnerId) continue;

        try {
          // 4. VERIFICATION LOGIC (L1/L2 Finality Gated)
          // paymentService.verifyTransaction now checks for EIP-4844 Blob Finalization.
          const confirmedPayment = await paymentService.verifyTransaction(p.id, p.txHash, {
            requireFinality: true, // 2026 Production Standard
            confirmations: p.chain === 'ETHEREUM' ? 2 : 12
          });
          
          // 5. AUTOMATED PROVISIONING (The 2026 Institutional Logic)
          // Once verified, we trigger the apiService to issue/renew the WIP_SK_... key.
          let planTier = confirmedPayment.amount >= 0.5 ? "PRO_PLAN_ANNUAL" : "PRO_PLAN_MONTHLY";
          
          await apiService.generateKey(confirmedPayment.wallet, planTier, {
            paymentId: confirmedPayment.id,
            meta: { traceId, source: 'AUTO_LISTENER' }
          });

          // 6. PROTOCOL SETTLEMENT: Sync Revenue and Trigger Auto-Burn
          await Promise.all([
            paymentService.syncRevenue?.(confirmedPayment),
            paymentService.triggerAutoBurn?.(confirmedPayment)
          ]);

          logger.info(`[${traceId}][CONFIRMED] Wallet: ${p.wallet} | Tier: ${planTier} | Trace: ${p.traceId}`);

        } catch (err: any) {
          const msg = err.message.toLowerCase();
          
          // 7. SMART RETRY & ERROR CLASSIFICATION
          if (msg.includes('finality') || msg.includes('pending') || msg.includes('depth')) {
            // Transaction is real, just waiting for the chain to "harden" (L2 Batching)
            await prisma.payment.update({
              where: { id: p.id },
              data: { status: 'PROCESSING' }
            }).catch(() => {});
            
            logger.debug(`[${traceId}] ID: ${p.id} awaiting deeper finality...`);
          } else {
            // Serious failure (Wrong amount, wrong recipient, or reverted)
            logger.warn(`[${traceId}][REJECTED] ID: ${p.id} | Reason: ${err.message}`);
          }
        } finally {
          await mutex.release(pLockId, pOwnerId);
          // 8. DYNAMIC JITTER: Protects your RPC provider (Alchemy/QuickNode) from Rate Limits
          await helpers.sleep(350); 
        }
      }

      // 9. AUTO-PURGE: Mark unconfirmed "Stale" intents as EXPIRED
      // If no payment is found after 4 hours, we assume the user abandoned the checkout.
      const expiryThreshold = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const expiredCount = await prisma.payment.updateMany({
        where: { 
          confirmed: false, 
          status: 'PENDING',
          createdAt: { lt: expiryThreshold } 
        },
        data: { status: 'EXPIRED' }
      });

      if (expiredCount.count > 0) {
        logger.info(`[${traceId}] Cleaned up ${expiredCount.count} abandoned payments.`);
      }

    } catch (err: any) {
      logger.error(`[${traceId}] Monitor Failure: ${err.message}`);
    } finally {
      // Release the global worker lock for the next heartbeat
      await mutex.release(globalLockId, ownerId);
    }
  }, HEARTBEAT_MS);
}

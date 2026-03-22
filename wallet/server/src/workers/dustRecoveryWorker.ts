import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { detectDustTokens } from '../modules/recovery/dustCalculator.js';
import { logger } from '../utils/logger.js';

/**
 * 12-Hour: Dust Recovery Discovery
 */
export const startDustWorker = () => {
  cron.schedule('0 */12 * * *', async () => {
    logger.info('[Worker: Dust] Scanning for recovery opportunities...');
    
    try {
      const wallets = await prisma.wallet.findMany();
      for (const w of wallets) {
        const profitable = await detectDustTokens(w.address);
        if (profitable.length > 0) {
          logger.info(`[Worker: Dust] Found ${profitable.length} rescue targets for ${w.address}`);
          // Logic: Optionally send a notification or update a "Ready to Rescue" flag in DB
        }
      }
    } catch (err: any) {
      logger.error(`[Worker: Dust] Scan failed: ${err.message}`);
    }
  });
  logger.info('[Worker] Dust Recovery Heartbeat Initialized.');
};

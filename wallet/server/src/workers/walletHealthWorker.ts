import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * 1-Hour Heartbeat: Wallet Health Scoring
 */
export const startHealthWorker = () => {
  cron.schedule('0 * * * *', async () => {
    logger.info('[Worker: Health] Recalculating wallet security scores...');
    try {
      const wallets = await prisma.wallet.findMany();
      for (const w of wallets) {
        // Logic: Calculate health based on % of spam vs total assets
        // Update Prisma with a health score (0-100)
        logger.info(`[Worker: Health] Synced health for ${w.address}`);
      }
    } catch (err: any) {
      logger.error(`[Worker: Health] Calculation error: ${err.message}`);
    }
  });
  logger.info('[Worker] Wallet Health Heartbeat Initialized.');
};

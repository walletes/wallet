import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { automationService } from '../modules/automation/automation.service.js';
import { logger } from '../utils/logger.js';

/**
 * 6-Hour: Auto-Burn for NFT Holders
 */
export const startAutoBurnWorker = () => {
  cron.schedule('0 */6 * * *', async () => {
    logger.info('[Worker: AutoBurn] Starting high-priority automation cycle...');

    try {
      const holders = await prisma.wallet.findMany();
      for (const holder of holders) {
        // automationService handles the NFT check internally
        await automationService.processAutomatedTasks(holder.address);
      }
      logger.info('[Worker: AutoBurn] Cycle completed successfully.');
    } catch (err: any) {
      logger.error(`[Worker: AutoBurn] Global failure: ${err.message}`);
    }
  });
  logger.info('[Worker] Auto-Burn Heartbeat Initialized.');
};

import cron from 'node-cron';
import { scanGlobalWallet } from '../blockchain/walletScanner.js';
import { tokenService } from '../modules/tokens/token.service.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * 24-Hour Heartbeat: Global Spam Sweep
 */
export const startSpamWorker = () => {
  cron.schedule('0 0 * * *', async () => {
    logger.info('[Worker: Spam] Identifying new malicious contracts across chains...');
    try {
      const wallets = await prisma.wallet.findMany({ take: 50 }); // Process in batches
      for (const w of wallets) {
        const assets = await scanGlobalWallet(w.address);
        const categorized = await tokenService.categorizeAssets(assets);
        logger.debug(`[Worker: Spam] ${w.address} has ${categorized.summary.spamCount} spam tokens.`);
      }
    } catch (err: any) {
      logger.error(`[Worker: Spam] Sweep failed: ${err.message}`);
    }
  });
  logger.info('[Worker] Spam Sweep Heartbeat Initialized.');
};

import { detectDustTokens, DustReport } from './dustCalculator.js';
import { getSmartRescueQuote } from './swapExecutor.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../config/database.js';

export const recoveryService = {
  async executeDustRecovery(walletAddress: string) {
    const startTime = Date.now();
    const safeAddr = walletAddress.toLowerCase();

    try {
      logger.info(`[Recovery] Starting smart rescue scan: ${safeAddr}`);

      // 1. Get tokens and filter profitable ones
      const dustReports: DustReport[] = await detectDustTokens(safeAddr);
      const profitableTokens = dustReports.filter(t => t.isProfitable);

      if (profitableTokens.length === 0) {
        return { 
          success: true, 
          message: 'No profitable dust found', 
          data: { tokensFound: 0, plans: [] } 
        };
      }

      //  Get the real swap routes
      const rescuePlans = await getSmartRescueQuote(safeAddr, profitableTokens);

      //  Log to DB (Using camelCase correctly and fixing the 'err' type)
      await prisma.recoveryAttempt.create({
        data: {
          walletAddress: safeAddr,
          tokenCount: profitableTokens.length,
          estimatedTotalUsd: profitableTokens.reduce((sum, t) => sum + parseFloat(t.estimatedNetGain), 0).toString(),
          status: 'PENDING'
        }
      }).catch((err: any) => logger.warn(`[Recovery DB] Log skipped: ${err.message}`));

      const duration = (Date.now() - startTime) / 1000;

      return {
        success: true,
        wallet: safeAddr,
        latency: `${duration}s`,
        summary: {
          totalTokensFound: profitableTokens.length,
          activeChains: Array.from(new Set(profitableTokens.map(t => t.asset.chain))),
          totalPotentialGain: profitableTokens.reduce((sum, t) => sum + parseFloat(t.estimatedNetGain), 0)
        },
        plans: rescuePlans,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      logger.error(`[Recovery] Critical failure: ${error.message}`);
      return { 
        success: false, 
        error: 'Recovery engine failed', 
        message: error.message 
      };
    }
  }
};

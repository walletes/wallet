import { detectDustTokens, DustReport } from './dustCalculator.js';
import { getSmartRescueQuote } from './swapExecutor.js';
import { rulesEngine } from '../automation/rulesEngine.js';
import { feeCalculator } from '../../pricing/feeCalculator.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../config/database.js';

/**
 * Tier 1 Recovery Intelligence Service
 * Orchestrates: Discovery -> Risk Profiling -> Fee Optimization -> Execution.
 */
export const recoveryService = {
  /**
   * Heavy-Duty Recovery Logic
   * Dynamically adjusts fees based on user tier and asset health.
   */
  async executeDustRecovery(walletAddress: string) {
    if (!walletAddress) throw new Error('Wallet address is required');
    
    const startTime = Date.now();
    const safeAddr = walletAddress.toLowerCase();

    try {
      logger.info(`[Recovery] Starting intelligence-driven rescue scan: ${safeAddr}`);

      // 1. DYNAMIC INTELLIGENCE GATHERING
      // Parallel fetch of Dust, NFT Eligibility, and Security status
      const [dustReports, isNftHolder] = await Promise.all([
        detectDustTokens(safeAddr),
        rulesEngine.isEligibleForAutomation(safeAddr)
      ]);

      const profitableTokens = dustReports.filter(t => t.isProfitable);

      if (profitableTokens.length === 0) {
        return { 
          success: true, 
          message: 'Wallet Healthy: No profitable dust found.', 
          data: { tokensFound: 0, plans: [] } 
        };
      }

      // 2. INTELLIGENCE: Calculate Global Recovery Context
      const totalGrossUsd = profitableTokens.reduce((sum, t) => sum + (t.asset?.usdValue || 0), 0);
      const avgRiskScore = profitableTokens.length > 0 ? 
        profitableTokens.reduce((sum, t) => sum + (t.asset?.score || 100), 0) / profitableTokens.length : 100;

      // 3. DYNAMIC FEE CALCULATION (No Hardcoding)
      // Range: 2.5% - 7.5% based on NFT status and asset risk
      const feeContext = {
        amountUsd: totalGrossUsd,
        isGasless: true, // Auto-recovery implies platform handles gas
        isNftHolder,
        riskScore: 100 - avgRiskScore // Invert score to get risk
      };

      const feeReport = feeCalculator.calculateRescueFee(feeContext);

      if (!feeReport.isProfitable) {
        logger.warn(`[Recovery] Skipping low-value rescue for ${safeAddr}: $${totalGrossUsd} value.`);
        return { success: false, error: 'Low Value', message: 'Dust value does not cover execution costs.' };
      }

      // 4. STRATEGY ORCHESTRATION: Call SwapExecutor with Intelligence Metadata
      const rescuePlans = await getSmartRescueQuote(safeAddr, profitableTokens);

      // 5. ANALYTICS & DB LOGGING
      prisma.recoveryAttempt.create({
        data: {
          walletAddress: safeAddr,
          tokenCount: profitableTokens.length,
          estimatedTotalUsd: totalGrossUsd.toFixed(2),
          status: 'PENDING'
        }
      }).catch((err: any) => logger.warn(`[Recovery DB] Sync skipped: ${err.message}`));

      const duration = (Date.now() - startTime) / 1000;

      // 6. PREMIUM INTELLIGENCE RESPONSE
      return {
        success: true,
        wallet: safeAddr,
        latency: `${duration}s`,
        tier: feeReport.tier,
        pricing: {
          totalGrossUsd: totalGrossUsd.toFixed(2),
          protocolFeeUsd: feeReport.feeUsd.toFixed(2),
          userNetUsd: feeReport.userShareUsd.toFixed(2),
          feePercentage: feeReport.percentage
        },
        summary: {
          totalTokensFound: profitableTokens.length,
          activeChains: [...new Set(profitableTokens.map(t => t.asset.chain))],
        },
        plans: rescuePlans,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      logger.error(`[Recovery] Critical failure for ${safeAddr}: ${error.message}`);
      return { 
        success: false, 
        error: 'Recovery engine failed', 
        message: error.message 
      };
    }
  }
};

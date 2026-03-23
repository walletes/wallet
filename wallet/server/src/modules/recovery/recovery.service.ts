import { detectDustTokens, DustReport } from './dustCalculator.js';
import { swapExecutor } from './swapExecutor.js';
import { rulesEngine } from '../automation/rulesEngine.js';
import { feeCalculator } from '../../pricing/feeCalculator.js';
import { flashbotsExecution } from '../../blockchain/flashbotsExecution.js';
import { EVM_CHAINS } from '../../blockchain/chains.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../config/database.js';

/**
 * Tier 1 Recovery Intelligence Service
 * Orchestrates: Discovery -> Risk Profiling -> Fee Optimization -> Execution.
 * Upgraded for Production: Secure Encrypted Key Handling and Multi-Chain MEV Protection.
 */
export const recoveryService = {
  /**
   * Heavy-Duty Recovery Logic
   * Dynamically adjusts fees based on user tier and asset health.
   * @param walletAddress User's public address
   * @param encryptedPrivateKey Encrypted key from DB (v1:iv:tag:cipher)
   */
  async executeDustRecovery(walletAddress: string, encryptedPrivateKey?: string) {
    if (!walletAddress) throw new Error('Wallet address is required');
    
    const startTime = Date.now();
    const safeAddr = walletAddress.toLowerCase();

    try {
      logger.info(`[Recovery] Starting intelligence-driven rescue scan: ${safeAddr}`);

      // 1. DYNAMIC INTELLIGENCE GATHERING
      const [dustReports, isNftHolder] = await Promise.all([
        detectDustTokens(safeAddr),
        rulesEngine.isEligibleForAutomation(safeAddr)
      ]);

      // Only recover tokens that have been flagged as profitable by the calculator
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

      // 3. DYNAMIC FEE CALCULATION
      const feeContext = {
        amountUsd: totalGrossUsd,
        isGasless: true, // Flashbots bundles don't require public gas if structured correctly
        isNftHolder,
        riskScore: 100 - avgRiskScore 
      };

      const feeReport = feeCalculator.calculateRescueFee(feeContext);

      if (!feeReport.isProfitable) {
        logger.warn(`[Recovery] Skipping low-value rescue for ${safeAddr}: $${totalGrossUsd.toFixed(2)} value.`);
        return { success: false, error: 'Low Value', message: 'Dust value does not cover execution costs.' };
      }

      // 4. STRATEGY ORCHESTRATION: Get Quote and build multi-hop swap payloads
      const rescuePlans = await swapExecutor.getSmartRescueQuote(safeAddr, profitableTokens);
      const executionResults = [];

      // 5. DYNAMIC EXECUTION: If encryptedPrivateKey is provided, trigger the Flashbots Bridge
      if (encryptedPrivateKey && rescuePlans.length > 0) {
        logger.info(`[Recovery] Initiating Automated MEV-Shielded Execution for ${safeAddr}`);
        
        for (const plan of rescuePlans) {
          const chain = EVM_CHAINS.find(c => c.name === plan.chain);
          
          // Flashbots-only execution for 'PROTECTED' or 'RELAYED' strategies
          if (chain && (plan.strategy === 'RELAYED' || plan.securityStatus === 'PROTECTED')) {
             logger.info(`[Recovery] Sending ${plan.payloads.length} swap steps to ${plan.chain} via Flashbots...`);
             
             // Pass encrypted key - decryption happens safely inside flashbotsExecution
             const result = await flashbotsExecution.executeBundle(
               encryptedPrivateKey,
               chain.rpc,
               plan.payloads || [],
               chain.id
             );
             
             executionResults.push({
               chain: plan.chain,
               success: result.success,
               txHash: result.txHash,
               error: result.error
             });

             if (result.success) {
               logger.info(`[Recovery] Success on ${plan.chain}! Funds migrated to safe destination.`);
             } else {
               logger.error(`[Recovery] Bundle failed on ${plan.chain}: ${result.error}`);
             }
          }
        }
      }

      // 6. ANALYTICS & DB LOGGING (Persistent Tracking of Recoveries)
      await prisma.recoveryAttempt.create({
        data: {
          walletAddress: safeAddr,
          tokenCount: profitableTokens.length,
          estimatedTotalUsd: totalGrossUsd.toFixed(2),
          status: executionResults.some(r => r.success) ? 'SUCCESS' : 'PENDING'
        }
      }).catch((err: any) => logger.warn(`[Recovery DB] Sync skipped: ${err.message}`));

      const duration = (Date.now() - startTime) / 1000;

      // 7. PREMIUM INTELLIGENCE RESPONSE
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
          executionsPerformed: executionResults.length,
          successfulExecutions: executionResults.filter(r => r.success).length
        },
        plans: rescuePlans,
        executionDetails: executionResults,
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

import { batchBurnTokens } from './batchBurnEngine.js';
import { tokenService } from '../tokens/token.service.js';
import { scanGlobalWallet } from '../../blockchain/walletScanner.js';
import { flashbotsExecution } from '../../blockchain/flashbotsExecution.js';
import { EVM_CHAINS } from '../../blockchain/chains.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../config/database.js';

/**
 * Premium Burn Service - Tier 1 
 * Integrated with MEV-Shielding and Intelligence-driven batching.
 * Upgraded for Production: Handles Encrypted Keys and Multi-Chain Nonce logic.
 */
export const burnService = {
  /**
   * Dynamically handles spam burning. 
   * @param walletAddress The user's address
   * @param encryptedPrivateKey Encrypted key from DB (v1:iv:tag:cipher)
   * @param preScannedTokens Optional pre-filtered list
   */
  async executeSpamBurn(walletAddress: string, encryptedPrivateKey: string, preScannedTokens?: any[]) {
    const startTime = Date.now();
    const safeAddr = walletAddress.toLowerCase();

    try {
      logger.info(`[BurnService] Initiating Sanitization: ${safeAddr}`);

      let spamTokens = preScannedTokens;

      // 1. INTELLIGENCE: Scan if not provided
      if (!spamTokens) {
        const rawAssets = await scanGlobalWallet(safeAddr);
        const categorized = await tokenService.categorizeAssets(rawAssets);
        spamTokens = categorized.groups.spam;
      }

      if (!spamTokens || spamTokens.length === 0) {
        return {
          success: true,
          message: 'Wallet is clean! No spam tokens detected.',
          data: { burnedCount: 0, plans: [] }
        };
      }

      // 2. BATCH PLANNING: Build the payloads
      // Ensure batchBurnTokens is optimized for the latest gas prices
      const burnPlans = await batchBurnTokens(safeAddr, spamTokens);
      const executionResults = [];

      // 3. DYNAMIC EXECUTION: Loop through plans and execute via Flashbots Bridge
      for (const plan of burnPlans) {
        const chain = EVM_CHAINS.find(c => c.name === plan.chain);
        
        // Safety: Only execute if we have a valid chain config and payloads
        if (chain && plan.status === 'PROTECTED' && plan.payloads.length > 0) {
          logger.info(`[BurnService] Sending ${plan.payloads.length} txs via Flashbots to ${plan.chain}...`);
          
          // Pass the ENCRYPTED key directly; flashbotsExecution handles the decryption in-memory
          const result = await flashbotsExecution.executeBundle(
            encryptedPrivateKey,
            chain.rpc,
            plan.payloads,
            chain.id
          );
          
          executionResults.push({
            chain: plan.chain,
            success: result.success,
            error: result.error,
            txHash: result.txHash
          });

          if (result.success) {
            logger.info(`[BurnService] Successfully cleared spam on ${plan.chain}`);
          } else {
            logger.warn(`[BurnService] Flashbots submission failed on ${plan.chain}: ${result.error}`);
          }
        }
      }

      // 4. PERSISTENCE & ANALYTICS: Update Health Score
      // Real Money: We only reset health score if at least one burn succeeded
      const hasSuccess = executionResults.some(r => r.success);
      
      await prisma.wallet.update({
        where: { address: safeAddr },
        data: { 
          lastSynced: new Date(),
          healthScore: hasSuccess ? 100 : undefined,
          riskLevel: hasSuccess ? 'LOW' : undefined
        }
      }).catch((err: any) => logger.warn(`[BurnService] DB Sync skipped: ${err.message}`));

      const duration = (Date.now() - startTime) / 1000;

      return {
        success: true,
        wallet: safeAddr,
        latency: `${duration}s`,
        summary: {
          spamTokensFound: spamTokens.length,
          totalChainsProcessed: executionResults.length,
          successfulChains: executionResults.filter(r => r.success).length
        },
        executionResults,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      logger.error(`[BurnService] Critical failure for ${safeAddr}: ${error.message}`);
      return {
        success: false,
        error: 'Spam Burn Engine encountered an error',
        message: error.message
      };
    }
  }
};

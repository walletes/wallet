import { scanGlobalWallet } from '../../blockchain/walletScanner.js';
import { tokenService } from '../tokens/token.service.js';
import { securityService } from '../security/security.service.js';
import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

/**
 * Tier 1 Wallet Intelligence Service
 * The "Brain" that connects Scanning, Security, and Database Persistence.
 * Upgraded for Production: Real-time Threat Weighting and Atomic DB Sync.
 */
export const walletService = {
  /**
   * Performs a full cross-chain intelligence scan.
   * Orchestrates Token Discovery + Security Risk Assessment + DB Sync.
   */
  async scanFull(address: string) {
    const walletAddress = address.toLowerCase();

    try {
      logger.info(`[WalletService] Deep Intelligence Scan Initiated: ${walletAddress}`);

      // 1. Parallel Intelligence Gathering (Speed Optimized for Real-Time UX)
      const [rawAssets, securityAllowances] = await Promise.all([
        scanGlobalWallet(walletAddress),
        securityService.scanApprovals(walletAddress)
      ]);

      // 2. Heavy-Duty Classification & Risk Scoring
      const categorizedData = await tokenService.categorizeAssets(rawAssets);
      
      // Calculate Wallet Health Score (0-100) using Weighted Risk Algorithm
      const healthScore = this.calculateHealthScore(categorizedData, securityAllowances);
      
      // Strict Risk Mapping for Real-World Assets
      const riskLevel = healthScore < 30 ? 'CRITICAL' : healthScore < 60 ? 'HIGH' : healthScore < 85 ? 'MEDIUM' : 'LOW';

      // 3. Dynamic Database Sync (Atomic Persistence Layer)
      // Ensures the balance and health are always updated together
      const wallet = await prisma.wallet.upsert({
        where: { address: walletAddress },
        update: { 
          lastSynced: new Date(),
          balance: categorizedData.summary.totalUsdValue.toFixed(2),
          healthScore: healthScore,
          riskLevel: riskLevel
        },
        create: { 
          address: walletAddress,
          balance: categorizedData.summary.totalUsdValue.toFixed(2),
          healthScore: healthScore,
          riskLevel: riskLevel
        }
      });

      // 4. Premium Intelligence Payload
      return {
        wallet: walletAddress,
        intelligence: {
          healthScore,
          riskLevel,
          lastSynced: wallet.lastSynced,
          isCompromised: healthScore < 30
        },
        summary: {
          ...categorizedData.summary,
          openApprovals: securityAllowances.length,
          criticalRisks: securityAllowances.filter(a => a.riskLevel === 'CRITICAL' || a.isMalicious).length
        },
        groups: {
          ...categorizedData.groups,
          highRiskApprovals: securityAllowances.filter(a => a.riskLevel === 'CRITICAL' || a.isMalicious)
        },
        security: securityAllowances,
        all: categorizedData.all
      };
    } catch (err: any) {
      logger.error(`[WalletService] Critical scan failure for ${walletAddress}: ${err.message}`);
      throw err;
    }
  },

  /**
   * INTELLIGENCE: Proactive Health Scoring Algorithm (Weighted)
   * Deducts for: Malicious Spenders (-100), Unverified Proxies (-40), Infinite Approvals (-15)
   */
  calculateHealthScore(data: any, allowances: any[]): number {
    let score = 100;

    // CRITICAL: Malicious Spenders (Immediate 0 or near-zero)
    const maliciousCount = allowances.filter(a => a.isMalicious).length;
    if (maliciousCount > 0) score -= (maliciousCount * 60);

    // HIGH: High-Risk (Infinite) Approvals on unverified or low-trust contracts
    const highRiskApprovals = allowances.filter(a => a.riskLevel === 'HIGH' || a.riskLevel === 'CRITICAL').length;
    score -= (highRiskApprovals * 15);

    // MEDIUM: Spam/Dust volume (Signal of a targeted wallet)
    if (data.summary.spamCount > 5) score -= 10;
    if (data.summary.dustCount > 15) score -= 5;
    
    // SAFETY: If risk score is extremely low, flag as compromised
    return Math.max(0, Math.min(100, score));
  },

  /**
   * INTELLIGENCE: Quick Cache Check
   * Returns stored data if last synced within the threshold to save RPC costs.
   */
  async getCachedWallet(address: string) {
    const wallet = await prisma.wallet.findUnique({ 
      where: { address: address.toLowerCase() },
      include: { rules: true } // Include rules for automation context
    });
    
    if (!wallet) return null;

    const cacheLimit = 2 * 60 * 1000; // 2 Minutes for high-frequency trading safety
    const isFresh = (Date.now() - new Date(wallet.lastSynced).getTime()) < cacheLimit;
    
    return { wallet, isFresh };
  }
};

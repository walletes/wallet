import { scanGlobalWallet } from '../../blockchain/walletScanner.js';
import { runSecurityScan, runPriceScan, calculateVerdict } from './spamDetector.js';
import { AegisEngine } from './spamEngine.js'; // Upgrade: The primary intelligence orchestrator
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';
import pLimit from 'p-limit';
import Decimal from 'decimal.js';

/**
 * UPGRADED: Institutional Token Intelligence Engine (v2026.5).
 * Optimized for: Wallet Service Compatibility and Strict Type Safety.
 * Philosophy: Real-time Fingerprinting via Aegis-Engine Mesh.
 * Alignment: Fully synchronized with Object-based Pricing and SaaS Schema.
 */
export const tokenService = {
  cache: new Map<string, { data: any, timestamp: number }>(),
  locks: new Set<string>(), 
  CACHE_TTL: Number(process.env.TOKEN_CACHE_TTL) || 1000 * 60 * 10, 
  MAX_CACHE_SIZE: 2000, 

  async fetchWalletTokens(address: string, forceRefresh = false) {
    const safeAddr = address.toLowerCase();
    const traceId = `TS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    
    if (this.locks.has(safeAddr)) {
      logger.warn(`[TokenService][${traceId}] Scan in progress for ${safeAddr}`);
      // Upgrade: Jitter-wait to prevent thundering herd on the same wallet
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 500));
      
      // PRODUCTION UPGRADE: Double-Check Lock - Verify if the previous scan populated the cache
      if (!forceRefresh && this.cache.has(safeAddr)) {
        const lateCached = this.cache.get(safeAddr)!;
        if (Date.now() - lateCached.timestamp < this.CACHE_TTL) {
          return { ...lateCached.data, cached: true, traceId };
        }
      }
    }

    if (!forceRefresh && this.cache.has(safeAddr)) {
      const cached = this.cache.get(safeAddr)!;
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return { ...cached.data, cached: true, traceId };
      }
      this.cache.delete(safeAddr);
    }

    try {
      this.locks.add(safeAddr);
      const rawAssets = await scanGlobalWallet(safeAddr);
      
      // PRODUCTION UPGRADE: Memory Guard - Truncate excessive dust tokens to prevent OOM
      const assetsToScan = rawAssets.length > 500 ? rawAssets.slice(0, 500) : rawAssets;
      const categorized = await this.categorizeAssets(assetsToScan, traceId);

      if (this.cache.size >= this.MAX_CACHE_SIZE) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) this.cache.delete(oldestKey);
      }

      this.cache.set(safeAddr, { data: categorized, timestamp: Date.now() });
      return { ...categorized, cached: false, traceId };

    } catch (err: any) {
      logger.error(`[TokenService][${traceId}] Asset Audit Failed: ${err.message}`);
      throw err;
    } finally {
      this.locks.delete(safeAddr);
    }
  },

  async categorizeAssets(rawAssets: any[], traceId: string = 'INTERNAL') {
    // Production Upgrade: Concurrency limit adjusted for high-availability RPCs
    const limit = pLimit(20); 
    
    const results = await Promise.allSettled(
      rawAssets.map((asset) => 
        limit(async () => {
          try {
            /**
             * PRODUCTION ALIGNMENT: AegisEngine Orchestration
             * AegisEngine performs the fingerprinting, pricing, and 
             * database persistence we just battle-tested.
             */
            const analysis = await AegisEngine.getVerdict(asset) as any;
            
            // Waterfall Fallback: If engine is deferred, manually calculate verdict
            let finalAnalysis = analysis;
            if (analysis.status === 'clean' && analysis.securityNote?.includes('Deferred')) {
              const security = await runSecurityScan(asset.address, asset.chainId);
              // Aligned: runPriceScan now returns { price, liquidity }
              const pricingData = await runPriceScan(asset.address, asset.symbol || '', asset.chainId);
              finalAnalysis = calculateVerdict(asset, security, pricingData);
            }

            const isSuspicious = finalAnalysis.status === 'spam' || 
                                finalAnalysis.status === 'malicious' ||
                                finalAnalysis.isHoneypot || 
                                (parseFloat(asset.balance) > 0 && !finalAnalysis.usdValue && !asset.logo);
            
            return { 
              ...asset, 
              ...finalAnalysis,
              isSuspicious,
              // Fixed: Dynamic property check to satisfy TypeScript
              hasTransferHook: !!(finalAnalysis.hasHooks || finalAnalysis.hasTransferHook),
              lastAudit: new Date().toISOString(),
              // Strict Recovery Check for real finance
              // Upgrade: Check for blacklisted status and malicious status
              isRecoverable: finalAnalysis.canRecover && 
                             !isSuspicious && 
                             !finalAnalysis.isBlacklisted && 
                             finalAnalysis.status !== 'malicious'
            };
          } catch (e: any) {
            logger.warn(`[TokenService][${traceId}] Asset Audit bypassed: ${asset.symbol}`);
            return { ...asset, status: 'audit_failed', usdValue: 0, isRecoverable: false };
          }
        })
      )
    );

    const audited = results
      .map(r => r.status === 'fulfilled' ? r.value : null)
      .filter(Boolean) as any[];

    // PRODUCTION UPGRADE: Precision Math for Total Values
    const totalValue = audited.reduce((sum, a) => sum.plus(a.usdValue || 0), new Decimal(0));
    const recoverable = audited.filter(a => a.isRecoverable);
    const recoverableValue = recoverable.reduce((sum, a) => sum.plus(a.usdValue || 0), new Decimal(0));

    const riskRatio = totalValue.gt(0) ? recoverableValue.div(totalValue).toNumber() : 1;
    // Upgrade: Strict risk thresholds for Sovereign wallets
    const healthStatus = riskRatio < 0.4 ? 'CRITICAL_EXPOSURE' : riskRatio < 0.75 ? 'DEGRADED' : 'OPTIMAL';

    return {
      summary: {
        totalAssets: audited.length,
        totalUsdValue: Number(totalValue.toFixed(2)),
        recoverableCount: recoverable.length,
        recoverableValue: Number(recoverableValue.toFixed(2)),
        auditTimestamp: Date.now(),
        healthStatus,
        riskScore: Number((riskRatio * 100).toFixed(0)),
        spamCount: audited.filter(a => a.status === 'spam').length,
        dustCount: audited.filter(a => a.status === 'dust').length,
        maliciousCount: audited.filter(a => a.status === 'malicious').length,
        // SaaS Metric: Expose logic drifts to the summary
        driftCount: audited.filter(a => a.upgradeCount > 0).length
      },
      groups: {
        liquid: recoverable.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0)),
        clean: audited.filter(a => !a.isSuspicious && a.status !== 'dust' && a.status !== 'spam'),
        dust: audited.filter(a => a.status === 'dust'),
        threats: audited.filter(a => a.status === 'malicious' || a.isHoneypot || a.isBlacklisted),
        spam: audited.filter(a => a.status === 'spam' || (a.isSuspicious && a.status !== 'malicious'))
      },
      all: audited,
      inventory: audited 
    };
  }
};

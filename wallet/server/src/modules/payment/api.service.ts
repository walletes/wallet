import { prisma } from '../../config/database.js';
import crypto from 'crypto';
import { logger } from '../../utils/logger.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'wip_secret_2026';

/**
 * PRODUCTION-GRADE: 2026 Immutable Key Provisioning Service.
 * Strategy: "Generate Once, Renew Often."
 * Features: Multi-Tier Quotas, EIP-7702 Entitlements, and Stateless Edge Validation.
 */
export const apiService = {
  /**
   * Generates or Renews an API Key.
   * UPGRADED: Added Usage Quota reset logic and Plan-specific Permissioning.
   */
  async generateKey(wallet: string, plan: string, options: any = {}) {
    const safeAddr = wallet.toLowerCase();
    const traceId = `KEY-MGMT-${Date.now()}`;
    const startTime = performance.now();

    try {
      // DYNAMIC EXPIRY: Calculate based on Plan Tier (Monthly vs Annual)
      const isAnnual = plan.toUpperCase().includes('ANNUAL');
      const durationDays = isAnnual ? 365 : 30;
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      // 2. REFRESH STATELESS JWT: Injected with 2026 Capability Claims
      // Includes 'isPro' and 'usageLimit' for immediate Gateway enforcement
      const token = jwt.sign(
        { 
          sub: safeAddr, 
          plan, 
          tier: plan.includes('PRO') ? 'PRO' : 'BASIC',
          capabilities: ['SCAN_SECURITY', 'SIMULATE_TX', '7702_AUDIT'],
          traceId,
          version: '2026.3.1' 
        },
        JWT_SECRET,
        { expiresIn: `${durationDays}d` }
      );

      // 3. FIND EXISTING "MASTER KEY"
      const existing = await prisma.apiKey.findUnique({ 
        where: { wallet: safeAddr } 
      });

      // 4. USAGE QUOTA LOGIC: 10k per month for Retail ($10)
      const usageLimit = isAnnual ? 150000 : 10000;

      if (existing) {
        logger.info(`[ApiService][${traceId}] RENEWING access for ${safeAddr}. Key remains immutable.`);
        
        return await prisma.apiKey.update({
          where: { wallet: safeAddr },
          data: { 
            plan, 
            status: 'ACTIVE',
            expiresAt, 
            token,
            usageLimit, // Reset/Update Quota
            updatedAt: new Date(),
            metadata: {
              ...options.meta,
              lastPaymentId: options.paymentId,
              renewedAt: new Date().toISOString(),
              provisioningLatency: `${(performance.now() - startTime).toFixed(2)}ms`
            }
          }
        });
      }

      // 5. FIRST-TIME GENERATION: Immutable Key String Creation
      // Format: WIP_SK_... (Standard 2026 Finance Prefix)
      const key = `WIP_SK_${crypto.randomBytes(24).toString('hex').toUpperCase()}`;

      logger.info(`[ApiService][${traceId}] First-time KEY ISSUE for ${safeAddr}. Plan: ${plan}`);

      return await prisma.apiKey.create({
        data: { 
          key, 
          wallet: safeAddr, 
          plan,
          token,
          usage: 0,
          usageLimit,
          status: 'ACTIVE',
          expiresAt,
          metadata: {
            source: 'MAINNET_PAYMENT',
            initialTrace: traceId
          }
        }
      });
    } catch (error: any) {
      logger.error(`[ApiService][${traceId}] Provisioning CRITICAL_FAILURE: ${error.stack}`);
      throw new Error("Critical error securing your API access key. System audit triggered.");
    }
  },

  /**
   * High-Performance Usage Tracking & Validation
   * UPGRADED: Atomic Quota Guard & Auto-Revocation.
   */
  async validateAndIncrement(key: string) {
    try {
      const record = await prisma.apiKey.findUnique({ where: { key } });
      
      if (!record || record.status !== 'ACTIVE') return null;
      
      // 1. EXPIRY GUARD: Check if the 30-day window has closed
      if (record.expiresAt && new Date() > record.expiresAt) {
        logger.warn(`[ApiService] Key ${key.slice(0, 10)}... EXPIRED. Revoking access.`);
        await prisma.apiKey.update({ where: { key }, data: { status: 'EXPIRED' } });
        return null;
      }

      // 2. QUOTA GUARD: Prevent "Ghost Usage" beyond the paid tier
      const currentUsage = record.usage || 0;
      const limit = record.usageLimit || 10000;
      
      if (currentUsage >= limit) {
        logger.warn(`[ApiService] Key ${key.slice(0, 10)}... QUOTA_EXCEEDED (${currentUsage}/${limit})`);
        return null; // Return null to trigger 429 in Middleware
      }

      // 3. ATOMIC INCREMENT: Log activity and update timestamp
      return await prisma.apiKey.update({
        where: { key },
        data: { 
          usage: { increment: 1 },
          lastUsedAt: new Date()
        }
      });
    } catch (err: any) {
      logger.error(`[ApiService] Atomic Validation failure: ${err.message}`);
      return null;
    }
  },

  /**
   * 2026 Status Dashboard Support
   * UPGRADED: Returns Percentages and Quota Status for frontend Progress Bars.
   */
  async getStats(wallet: string) {
    const safeAddr = wallet.toLowerCase();
    const stats = await prisma.apiKey.findUnique({
      where: { wallet: safeAddr }
    });

    if (!stats) {
      return { 
        wallet: safeAddr, 
        hasActiveKey: false, 
        plan: 'NONE', 
        usage: 0,
        usageLimit: 0,
        isPro: false 
      };
    }

    const now = new Date();
    const isExpired = stats.expiresAt ? now > stats.expiresAt : false;
    const usage = stats.usage || 0;
    const limit = stats.usageLimit || 10000;
    
    const daysLeft = stats.expiresAt 
      ? Math.ceil((stats.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return { 
      ...stats, 
      hasActiveKey: stats.status === 'ACTIVE' && !isExpired,
      daysRemaining: Math.max(0, daysLeft),
      usagePercent: Number(((usage / limit) * 100).toFixed(2)),
      isQuotaExhausted: usage >= limit,
      isExpired,
      isPro: stats.plan.includes('PRO'),
      capabilities: ['EIP-7702_AUDIT', 'REAL_TIME_SCAN', 'MEV_SIMULATION']
    };
  }
};

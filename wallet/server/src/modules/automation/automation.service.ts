import { rulesEngine } from './rulesEngine.js';
import { burnService } from '../burn/burn.service.js';
import { recoveryService } from '../recovery/recovery.service.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../config/database.js';

/**
 * Premium Automation Service
 * Orchestrates tasks based on NFT Gating and User-Defined DB Rules.
 * Upgraded with Concurrency Locking for Real-World Funds.
 */
export const automationService = {
  // Prevent parallel execution on the same wallet (Nonce Protection)
  activeLocks: new Set<string>(),

  /**
   * Background Execution Engine
   * Includes Concurrency Locking and Detailed Error Tracking.
   */
  async processAutomatedTasks(walletAddress: string) {
    const safeAddr = walletAddress.toLowerCase();

    // 1. CONCURRENCY LOCK: Vital for real money to prevent nonce collisions
    if (this.activeLocks.has(safeAddr)) {
      logger.warn(`[Automation] Wallet ${safeAddr} is already busy. Skipping to avoid collision.`);
      return { status: 'LOCKED', reason: 'ALREADY_PROCESSING' };
    }

    try {
      this.activeLocks.add(safeAddr);

      // 2. Gating: Check Base NFT Membership
      const isEligible = await rulesEngine.isEligibleForAutomation(safeAddr);

      if (!isEligible) {
        logger.info(`[Automation] Wallet ${safeAddr} - No NFT. Skipping auto-cycle.`);
        return { status: 'SKIPPED', reason: 'NOT_A_HOLDER' };
      }

      // 3. Load User Rules from Prisma
      const userRules = await prisma.automationRule.findMany({
        where: { walletAddress: safeAddr, active: true }
      });

      if (userRules.length === 0) {
        logger.info(`[Automation] Holder ${safeAddr} has no active rules. Skipping.`);
        return { status: 'SKIPPED', reason: 'NO_ACTIVE_RULES' };
      }

      // 4. Conditional Execution Logic
      const burnRule = userRules.find((r: any) => r.type === 'AUTO_BURN');
      const recoveryRule = userRules.find((r: any) => r.type === 'AUTO_RECOVERY');

      logger.info(`[Automation] Holder: ${safeAddr} | Rules: Burn(${!!burnRule}) Recovery(${!!recoveryRule})`);

      const taskNames: string[] = [];
      const tasks: Promise<any>[] = [];

      // 5. TASK PUSHING (Passing encrypted keys to downstream services)
      if (burnRule) {
        tasks.push(burnService.executeSpamBurn(safeAddr, burnRule.privateKey));
        taskNames.push('BURN');
      }
      
      if (recoveryRule) {
        tasks.push(recoveryService.executeDustRecovery(safeAddr, recoveryRule.privateKey));
        taskNames.push('RECOVERY');
      }

      if (tasks.length === 0) return { status: 'IDLE', wallet: safeAddr };

      // 6. Parallel execution
      const results = await Promise.allSettled(tasks);

      // 7. Cleanup & Persistence
      await prisma.wallet.update({
        where: { address: safeAddr },
        data: { lastSynced: new Date() }
      }).catch((e: any) => logger.warn(`[Automation] DB Sync Error for ${safeAddr}: ${e.message}`));

      // 8. Enhanced Production Response
      return {
        status: 'SUCCESS',
        wallet: safeAddr,
        tasksExecuted: tasks.length,
        timestamp: new Date().toISOString(),
        details: results.map((res: any, i: number) => ({
          task: taskNames[i],
          status: res.status,
          error: res.status === 'rejected' ? (res.reason?.message || res.reason) : null,
          result: res.status === 'fulfilled' ? 'SUCCESS' : 'FAILED'
        }))
      };
      
    } finally {
      // 9. RELEASE LOCK: Ensure the wallet can be processed in the next cycle
      this.activeLocks.delete(safeAddr);
    }
  }
};

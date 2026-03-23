import { prisma } from '../config/database.js';
import { logger } from './logger.js';
import crypto from 'crypto';

/**
 * UPGRADED: Atomic Distributed Mutex for Financial Integrity.
 * Prevents double-spending and race conditions using atomic database updates.
 */
export const mutex = {
  /**
   * Acquires a lock atomically using an "update-where" strategy.
   * @returns ownerId string if successful, null if locked.
   */
  async acquire(lockId: string, ttlMs: number = 10 * 60 * 1000): Promise<string | null> {
    const ownerId = crypto.randomUUID();
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - ttlMs);

    try {
      // 1. Ensure the record exists (Idempotent)
      await prisma.systemLock.upsert({
        where: { id: lockId },
        update: {},
        create: { id: lockId, isLocked: false, ownerId: null }
      });

      // 2. ATOMIC SWAP: Only update if it's currently unlocked OR stale
      const result = await prisma.systemLock.updateMany({
        where: {
          id: lockId,
          OR: [
            { isLocked: false },
            { updatedAt: { lt: staleThreshold } }
          ]
        },
        data: {
          isLocked: true,
          ownerId: ownerId,
          updatedAt: now
        }
      });

      if (result.count === 0) return null;

      logger.debug(`[Mutex] Lock Acquired: ${lockId} | Owner: ${ownerId}`);
      return ownerId;
    } catch (err: any) {
      logger.error(`[Mutex] Acquisition error for ${lockId}: ${err.message}`);
      return null;
    }
  },

  /**
   * Releases the lock ONLY if the caller is the current owner.
   * This prevents "stale" processes from accidentally unlocking new ones.
   */
  async release(lockId: string, ownerId: string | null) {
    if (!ownerId) return;
    
    try {
      const result = await prisma.systemLock.updateMany({
        where: { 
          id: lockId,
          ownerId: ownerId 
        },
        data: { 
          isLocked: false,
          ownerId: null 
        }
      });

      if (result.count > 0) {
        logger.debug(`[Mutex] Lock Released: ${lockId}`);
      }
    } catch (err: any) {
      logger.error(`[Mutex] Critical: Failed to release lock ${lockId}: ${err.message}`);
    }
  }
};

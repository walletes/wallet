import { Request, Response } from 'express';
import { recoveryService } from './recovery.service.js';
import { logger } from '../../utils/logger.js';
import { isAddress } from 'ethers';

/**
 * Premium Recovery Controller
 * Upgraded for Production: Features "Hot Potato" Key Handling and Memory Sanitization.
 * Connects the API request to the heavy-duty MEV-shielded execution service.
 */

// In-memory lock to prevent "Double Rescue" on the same wallet
const activeRecoveries = new Set<string>();

export async function recoverDustController(req: Request, res: Response) {
  const startTime = Date.now();
  
  // 1. INPUT EXTRACTION
  const address = (req.body.walletAddress || req.query.address) as string;
  let privateKey: string | undefined = req.body.privateKey as string;

  try {
    // 2. STRICT VALIDATION
    if (!address || !isAddress(address)) {
      return res.status(400).json({ 
        success: false, 
        error: 'A valid EVM walletAddress is required.' 
      });
    }

    const safeAddr = address.toLowerCase();

    // 3. CONCURRENCY GUARD: Prevent multiple recovery triggers for the same wallet
    if (activeRecoveries.has(safeAddr)) {
      return res.status(429).json({ 
        success: false, 
        error: 'Active Recovery', 
        message: 'A rescue mission is already in progress for this wallet.' 
      });
    }

    // 4. LOGGING SANITIZATION
    logger.info(`[RecoveryController] Initiating MEV-Shielded Scan/Rescue for: ${safeAddr}`);
    activeRecoveries.add(safeAddr);

    // 5. EXECUTION: Pass key to service and IMMEDIATELY scrub
    const result = await recoveryService.executeDustRecovery(safeAddr, privateKey);
    
    // Memory Hygiene: Assistance for Garbage Collection to wipe sensitive strings
    privateKey = undefined;
    if (req.body.privateKey) delete req.body.privateKey;

    if (!result.success) {
      return res.status(500).json({
        ...result,
        error: 'Recovery Engine Failure',
        message: result.error || 'The rescue mission could not be completed.'
      });
    }

    const duration = (Date.now() - startTime) / 1000;

    // 6. PRODUCTION RESPONSE
    return res.status(200).json({
      ...result,
      latency: `${duration}s`,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    logger.error(`[RecoveryController] Critical failure for ${address}: ${err.message}`);
    
    return res.status(500).json({ 
      success: false, 
      error: 'Recovery engine failed', 
      message: 'Internal Server Error' 
    });
  } finally {
    // Always release the lock so the wallet can be scanned again later
    privateKey = undefined;
    activeRecoveries.delete(address?.toLowerCase());
  }
}

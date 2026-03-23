import { Request, Response } from 'express';
import { recoveryService } from './recovery.service.js';
import { logger } from '../../utils/logger.js';
import { isAddress } from 'ethers';

/**
 * Premium Recovery Controller
 * Upgraded for Production: Features "Hot Potato" Key Handling and Memory Sanitization.
 * Connects the API request to the heavy-duty MEV-shielded execution service.
 */
export async function recoverDustController(req: Request, res: Response) {
  const startTime = Date.now();
  
  // 1. INPUT EXTRACTION
  const address = (req.body.walletAddress || req.query.address) as string;
  // Raw key from user - handled as a "Hot Potato" (minimal exposure)
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

    // 3. LOGGING SANITIZATION: Never log the privateKey or the full request body
    logger.info(`[RecoveryController] Initiating MEV-Shielded Scan/Rescue for: ${safeAddr}`);

    // 4. EXECUTION: Pass key to service and IMMEDIATELY nullify local reference
    // The service handles the heavy-duty discovery and Flashbots bundle building
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

    // 5. PRODUCTION RESPONSE: Detailed recovery summary and execution status
    return res.status(200).json({
      ...result,
      latency: `${duration}s`,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    // Safety Fallback: Ensure key is wiped even on crash
    privateKey = undefined;
    logger.error(`[RecoveryController] Critical failure for ${address}: ${err.message}`);
    
    return res.status(500).json({ 
      success: false, 
      error: 'Recovery engine failed', 
      message: 'Internal Server Error' 
    });
  }
}

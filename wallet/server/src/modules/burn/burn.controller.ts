import { Request, Response } from 'express';
import { isAddress } from 'ethers';
import { burnService } from './burn.service.js';
import { logger } from '../../utils/logger.js';

/**
 * Global Spam Burn Controller
 * Upgraded for Production: Features "Hot Potato" Key Handling and Memory Sanitization.
 */
export async function burnTokenController(req: Request, res: Response) {
  const startTime = Date.now();
  
  // 1. INPUT EXTRACTION
  const address = (req.body.address || req.query.address) as string;
  // Raw key from user - handled as a "Hot Potato" (minimal exposure)
  let privateKey: string | undefined = req.body.privateKey as string; 

  try {
    // 2. STRICT VALIDATION
    if (!address || !isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'A valid EVM wallet address is required.',
      });
    }

    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: 'PrivateKey is required for Flashbots-protected burn execution.',
      });
    }

    // 3. LOGGING SANITIZATION: Never log the body or the key
    logger.info(`[BurnController] Flashbots Request: ${address.toLowerCase()}`);

    // 4. EXECUTION: Pass key to service and IMMEDIATELY nullify local reference
    const result = await burnService.executeSpamBurn(address, privateKey);
    
    // Memory Hygiene: Nullify the local key variable to assist GC
    privateKey = undefined;
    if (req.body.privateKey) delete req.body.privateKey;

    if (!result.success) {
      return res.status(500).json({
        ...result,
        error: 'Flashbots Execution Failed',
        message: result.error || 'Check RPC or Flashbots relay status.'
      });
    }

    const duration = (Date.now() - startTime) / 1000;

    // 5. PRODUCTION RESPONSE: Detailed multi-chain results
    return res.status(200).json({
      success: true,
      address: address.toLowerCase(),
      latency: `${duration}s`,
      summary: result.summary,
      // Map 'executionResults' from the upgraded service
      results: (result as any).executionResults || [], 
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    // Ensure key is wiped even on crash
    privateKey = undefined;
    logger.error(`[BurnController] Critical failure for ${address}: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      error: 'The Spam Burn engine encountered a critical error.',
      message: 'Internal Server Error'
    });
  }
}

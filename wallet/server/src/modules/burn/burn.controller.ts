import { Request, Response } from 'express';
import { isAddress } from 'ethers';
import { burnService } from './burn.service.js';
import { logger } from '../../utils/logger.js';

/**
 * Global Spam Burn Controller
 * Upgraded: Supports Flashbots Private Execution via PrivateKey injection.
 */
export async function burnTokenController(req: Request, res: Response) {
  const startTime = Date.now();
  
  // 1. INPUT EXTRACTION
  const address = (req.body.address || req.query.address) as string;
  const privateKey = req.body.privateKey as string; // Required for Flashbots signing

  try {
    // 2. VALIDATION
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

    logger.info(`[BurnController] Initiating Flashbots-protected burn for: ${address}`);

    // 3. EXECUTION: Pass both address and key to the upgraded service
    const result = await burnService.executeSpamBurn(address, privateKey);

    if (!result.success) {
      return res.status(500).json(result);
    }

    const duration = (Date.now() - startTime) / 1000;

    // 4. DYNAMIC RESPONSE: Maps the service results to the frontend structure
    // Note: We use 'executionResults' from the upgraded service instead of 'plans'
    return res.status(200).json({
      success: true,
      address: address.toLowerCase(),
      latency: `${duration}s`,
      summary: result.summary,
      // Fixes TS2339: result.plans is now result.executionResults
      results: (result as any).executionResults || [], 
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error(`[BurnController] Critical failure for ${address}: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      error: 'The Spam Burn engine encountered a critical error.',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error'
    });
  }
}

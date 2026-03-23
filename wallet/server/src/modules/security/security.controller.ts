import { Request, Response } from 'express';
import { isAddress, getAddress } from 'ethers';
import { securityService } from './security.service.js';
import { logger } from '../../utils/logger.js';

/**
 * UPGRADED: Production-ready controller for handling real financial assets.
 * Added: Checksum validation, input normalization, and enhanced error masking.
 */
export async function scanSecurityController(req: Request, res: Response) {
  // Normalize input from both query and body
  const rawAddress = (req.query.address || req.body.address) as string;
  const network = ((req.query.network || req.body.network || 'ethereum') as string).toLowerCase();

  try {
    // 1. Strict Validation & Checksumming
    // Essential to ensure the address isn't malformed or a phishing variant
    if (!rawAddress || !isAddress(rawAddress)) {
      logger.warn(`[SecurityController] Invalid address attempt: ${rawAddress}`);
      return res.status(400).json({ 
        success: false, 
        error: 'A valid EVM wallet address is required' 
      });
    }

    // Normalize to checksummed format to prevent duplicate scans/cache misses
    const checksummedAddress = getAddress(rawAddress);
    
    logger.info(`[SecurityController] Scanning risk for: ${checksummedAddress} on ${network}`);

    // 2. Service Call
    const allowances = await securityService.scanApprovals(checksummedAddress, network);

    // 3. Enhanced Response Payload
    // Added metadata for audit trails (crucial for "real money" apps)
    return res.status(200).json({
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        network
      },
      wallet: checksummedAddress.toLowerCase(),
      network,
      riskReport: {
        totalApprovals: allowances.length,
        highRiskCount: allowances.filter(a => a.riskLevel === 'HIGH').length,
        mediumRiskCount: allowances.filter(a => a.riskLevel === 'MEDIUM').length,
        allowances
      }
    });

  } catch (err: any) {
    // 4. Context-Aware Error Logging & Masking
    // Do not leak raw provider/database errors to the client in production
    logger.error(`[SecurityController] Scan failed for ${rawAddress}: ${err.stack}`);

    const isClientError = err.name === 'ValidationError' || err.status === 400;
    
    res.status(isClientError ? 400 : 500).json({ 
      success: false, 
      error: isClientError ? err.message : 'Security scan failed. Please try again later.' 
    });
  }
}

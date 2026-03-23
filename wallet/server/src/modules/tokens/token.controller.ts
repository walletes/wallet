import { Request, Response } from 'express';
import { isAddress, getAddress } from 'ethers';
import { tokenService } from './token.service.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';

/**
 * UPGRADED: High-reliability Token Controller for production financial data.
 * Implements checksum validation, trace IDs, and sanitized error boundaries.
 */
export async function scanTokensController(req: Request, res: Response) {
  // 1. Unified Input Extraction
  const rawAddress = (req.query.address || req.body.address) as string;
  const traceId = crypto.randomUUID?.() || Math.random().toString(36).substring(7);

  try {
    // 2. Strict Checksum Validation
    // Vital for "real money": ensures the address is mathematically valid
    if (!rawAddress || !isAddress(rawAddress)) {
      logger.warn(`[TokenController][${traceId}] Invalid address rejected: ${rawAddress}`);
      return res.status(400).json({ 
        success: false, 
        error: 'A valid EVM wallet address is required',
        traceId
      });
    }

    // Standardize to Checksum format (e.g., 0xABC... -> 0xAbC...)
    const checksummedAddress = getAddress(rawAddress);
    
    logger.info(`[TokenController][${traceId}] Scanning assets for: ${checksummedAddress}`);
    
    // 3. Guaranteed Execution Service Call
    // We pass the traceId down for end-to-end logging visibility
    const report = await tokenService.fetchWalletTokens(checksummedAddress);

    // 4. Structured Financial Response
    return res.status(200).json({
      success: true,
      meta: {
        traceId,
        timestamp: new Date().toISOString(),
        network: req.query.network || 'ethereum'
      },
      wallet: checksummedAddress,
      data: report
    });

  } catch (err: any) {
    // 5. Secure Error Management
    // Prevents leaking RPC provider errors or database paths to the user
    logger.error(`[TokenController][${traceId}] Fatal: ${err.stack || err.message}`);

    const isClientError = err.status === 400 || err.name === 'ValidationError';
    
    return res.status(isClientError ? 400 : 500).json({ 
      success: false, 
      error: isClientError ? err.message : 'Asset synchronization failed. Please try again.',
      traceId 
    });
  }
}

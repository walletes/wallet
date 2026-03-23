import { Request, Response } from 'express';
import { isAddress, getAddress } from 'ethers';
import { walletService } from './wallet.service.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';

/**
 * UPGRADED: Production-grade Global Wallet Scan Controller.
 * Handles financial asset discovery with trace-based auditing and strict validation.
 */
export async function scanWalletController(req: Request, res: Response) {
  const startTime = Date.now();
  const traceId = crypto.randomUUID?.() || Math.random().toString(36).substring(7);
  
  // Normalize input from both query and body
  const rawAddress = (req.query.address || req.body.address) as string;

  try {
    // 1. Strict Validation & Checksumming
    // Prevents loss of funds and data fragmentation by enforcing EIP-55 checksums
    if (!rawAddress || !isAddress(rawAddress)) {
      logger.warn(`[WalletController][${traceId}] Rejected invalid address: ${rawAddress}`);
      return res.status(400).json({
        success: false,
        error: 'A valid EVM wallet address is required',
        traceId
      });
    }

    const checksummedAddress = getAddress(rawAddress);
    logger.info(`[WalletController][${traceId}] Initiating high-priority scan: ${checksummedAddress}`);

    // 2. Guaranteed Execution: Call the dynamic ScanFull engine
    // The service layer handles the cross-chain aggregation
    const data = await walletService.scanFull(checksummedAddress);

    // 3. Financial Metadata & Performance Tracking
    const durationMs = Date.now() - startTime;
    const durationSec = (durationMs / 1000).toFixed(2);

    return res.status(200).json({
      success: true,
      meta: {
        traceId,
        timestamp: new Date().toISOString(),
        latency: `${durationSec}s`,
        processedMs: durationMs
      },
      address: checksummedAddress,
      data: {
        summary: data.summary,
        groups: data.groups, // Categorized: Clean, Dust, Spam
        raw: data.all        // Master list for detailed audit
      }
    });

  } catch (error: any) {
    // 4. Secure Error Masking
    // Critical: Do not leak RPC provider keys or internal stack traces in production
    logger.error(`[WalletController][${traceId}] Global scan failed: ${error.stack || error.message}`);
    
    const status = error.status || 500;
    const userMessage = status === 500 
      ? 'Wallet synchronization failed. Our providers are currently congested.' 
      : error.message;

    return res.status(status).json({
      success: false,
      error: userMessage,
      traceId,
      timestamp: new Date().toISOString()
    });
  }
}

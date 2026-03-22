import { Request, Response } from 'express';
import { isAddress } from 'ethers';
import { walletService } from './wallet.service.js';
import { logger } from '../../utils/logger.js';

/**
 * Global Wallet Scan Controller
 * Handles cross-chain asset discovery, classification, and DB sync.
 */
export async function scanWalletController(req: Request, res: Response) {
  const startTime = Date.now();
  // Support both Query (GET) and Body (POST) for flexibility
  const address = (req.query.address || req.body.address) as string;

  try {
    //  Stop invalid addresses before hitting APIs
    if (!address || !isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'A valid EVM wallet address is required',
        received: address || 'none'
      });
    }

    logger.info(`[Controller] Starting full scan for: ${address}`);

    // Execution: Call the dynamic ScanFull engine
    const data = await walletService.scanFull(address);

    // 3. Metadata: Return execution time so UI can show "Scan took 2.4s"
    const duration = (Date.now() - startTime) / 1000;

    return res.status(200).json({
      success: true,
      address: address.toLowerCase(),
      timestamp: new Date().toISOString(),
      latency: `${duration}s`,
      data: {
        summary: data.summary,
        groups: data.groups, // Clean, Dust, Spam
        raw: data.all // Full list for detailed tables
      }
    });

  } catch (error: any) {
    logger.error(`[Controller] Scan failed for ${address}:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to complete wallet scan. One or more providers timed out.',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

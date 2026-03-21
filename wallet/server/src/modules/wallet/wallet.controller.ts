import { Request, Response } from 'express';
import { walletService } from './wallet.service.js';

export async function scanWalletController(req: Request, res: Response) {
  try {
    const address = req.query.address as string;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
      });
    }

    // Use the NEW scanFull engine to get all chains & assets
    const data = await walletService.scanFull(address);

    res.status(200).json({
      success: true,
      data,
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Invalid request',
    });
  }
}

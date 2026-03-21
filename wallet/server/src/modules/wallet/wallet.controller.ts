import { Request, Response } from 'express';
import { walletService } from './wallet.service.js';

export async function scanWalletController(req: Request, res: Response) {
  try {
    // ─── SAFE ADDRESS PARSING ─────────────────────────
    const addressParam = req.query.address;
    const address =
      typeof addressParam === 'string'
        ? addressParam
        : Array.isArray(addressParam)
        ? addressParam[0]
        : undefined;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
      });
    }

    // ─── SAFE TOKEN PARSING ───────────────────────────
    const tokensParam = req.query.tokens;
    const tokensRaw =
      typeof tokensParam === 'string'
        ? tokensParam
        : Array.isArray(tokensParam)
        ? tokensParam[0]
        : undefined;

    const tokenList = tokensRaw
      ? tokensRaw.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    // ─── SERVICE CALL ────────────────────────────────
    const data = await walletService.scan(address, tokenList);

    // ─── RESPONSE ────────────────────────────────────
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

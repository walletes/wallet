import express from 'express';
import { scanWalletController } from './wallet.controller.js';
import { walletService } from './wallet.service.js';

const walletRouter = express.Router();

// EXISTING
walletRouter.get('/scan', scanWalletController);

// NEW FULL MULTI-CHAIN SCAN
walletRouter.get('/scan-full', async (req, res) => {
  try {
    const address = req.query.address as string;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
      });
    }

    const data = await walletService.scanFull(address);

    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export const routeConfig = {
  path: '/v1/wallet',
  router: walletRouter,
};

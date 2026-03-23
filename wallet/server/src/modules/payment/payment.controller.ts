import { Request, Response } from 'express';
import { isAddress } from 'ethers';
import { paymentService } from './payment.service.js';
import { apiService } from './api.service.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../config/database.js';

/**
 * Premium Payment Controller
 * Handles the lifecycle of a payment from intent to API key delivery.
 * Upgraded for Production: Features Idempotency and Re-org Protection.
 */
export async function startPayment(req: Request, res: Response) {
  try {
    const { wallet, amount, chain } = req.body;

    // 1. STRICT VALIDATION
    if (!wallet || !isAddress(wallet)) {
      return res.status(400).json({ success: false, error: 'Invalid EVM wallet address' });
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Valid numerical payment amount required' });
    }

    // 2. CREATE INTENT: Atomic record in Postgres
    const intent = await paymentService.createIntent(
      wallet.toLowerCase(), 
      parseFloat(amount), 
      (chain || 'BASE').toUpperCase()
    );
    
    logger.info(`[Payment] Intent Created | ID: ${intent.id} | Wallet: ${wallet.toLowerCase()}`);

    res.json({ 
      success: true, 
      paymentId: intent.id,
      amount: intent.amount,
      chain: intent.chain,
      status: 'AWAITING_PAYMENT',
      instructions: 'Send exact amount to the protocol treasury address.'
    });
  } catch (err: any) {
    logger.error(`[Payment] Start failed: ${err.message}`);
    res.status(500).json({ success: false, error: 'Could not initialize payment infrastructure' });
  }
}

/**
 * Confirms on-chain transaction and delivers the "PRO_PLAN" API Key.
 * Upgraded with Idempotency: Prevents multiple keys for one TX.
 */
export async function confirmPayment(req: Request, res: Response) {
  try {
    const { paymentId, txHash } = req.body;

    if (!paymentId || !txHash || !txHash.startsWith('0x')) {
      return res.status(400).json({ success: false, error: 'Valid paymentId and txHash are required' });
    }

    // 1. IDEMPOTENCY CHECK: Ensure this TX hash hasn't been used already
    const existingPayment = await prisma.payment.findUnique({ where: { txHash } });
    if (existingPayment && existingPayment.confirmed) {
       return res.status(409).json({ 
         success: false, 
         error: 'Duplicate Transaction', 
         message: 'This transaction hash has already been claimed.' 
       });
    }

    logger.info(`[Payment] Verifying On-Chain Finality: ${txHash}`);

    // 2. VERIFY: Heavy-Duty check (checks block confirmations & recipient address)
    const confirmedPayment = await paymentService.verifyTransaction(paymentId, txHash);
    
    // 3. PROVISIONING: Atomic API key generation
    // If the payment is confirmed, we upgrade the user to the PRO_PLAN
    const apiKeyData = await apiService.generateKey(confirmedPayment.wallet, "PRO_PLAN");

    logger.info(`[Payment] Verified & Provisioned: ${confirmedPayment.wallet} (ID: ${paymentId})`);

    res.json({ 
      success: true, 
      status: 'confirmed', 
      data: {
        payment: {
            id: confirmedPayment.id,
            amount: confirmedPayment.amount,
            chain: confirmedPayment.chain
        },
        apiKey: apiKeyData.key,
        plan: apiKeyData.plan,
        features: ['Priority Flashbots Relay', 'Infinite Recovery Scans', '24/7 Auto-Burn']
      }
    });

  } catch (err: any) {
    logger.warn(`[Payment] Confirmation rejected: ${err.message}`);
    res.status(400).json({ 
      success: false, 
      error: 'Verification Failed',
      message: err.message || 'Transaction could not be verified on-chain.' 
    });
  }
}

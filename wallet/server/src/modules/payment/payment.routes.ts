import express from 'express';
import { startPayment, confirmPayment } from './payment.controller.js';

const router = express.Router();

/**
 * @route   POST /api/v1/payment/intent
 * @desc    Create a new payment intent
 */
router.post('/intent', startPayment);

/**
 * @route   POST /api/v1/payment/verify
 * @desc    Verify txHash and provision API Key
 */
router.post('/verify', confirmPayment);

export const routeConfig = {
  path: '/v1/payment',
  router: router,
  isPublic: true 
};

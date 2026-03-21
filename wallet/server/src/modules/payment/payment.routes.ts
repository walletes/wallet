import express from 'express';
import { processPayment } from './payment.controller.js';

const paymentRouter = express.Router();

paymentRouter.post('/pay', processPayment);

export const routeConfig = {
  path: '/payment',
  router: paymentRouter,
};

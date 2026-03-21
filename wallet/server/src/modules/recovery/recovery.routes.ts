import express from 'express';
import { recoverDust } from './recovery.controller.js';

const recoveryRouter = express.Router();

recoveryRouter.post('/dust', recoverDust);

export const routeConfig = {
  path: '/recovery',
  router: recoveryRouter,
};

import express from 'express';
import { burnTokenController } from './burn.controller.js';

const router = express.Router();

router.post('/execute', burnTokenController);

export const routeConfig = {
  path: '/v1/burn',
  router: router,
  isPublic: false
};

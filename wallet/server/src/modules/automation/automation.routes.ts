import express from 'express';
import { automationController } from './automation.controller.js';

const router = express.Router();

router.get('/rules', automationController.getRules);
router.post('/rules', automationController.addRule);
router.patch('/rules/:id', automationController.updateRule);
router.delete('/rules/:id', automationController.deleteRule);

export const routeConfig = {
  path: '/v1/automation',
  router: router,
  isPublic: false
};

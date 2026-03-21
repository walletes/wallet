import express from 'express';
import { getRules, updateRule } from './automation.controller.js';

const automationRouter = express.Router();

automationRouter.get('/rules', getRules);
automationRouter.post('/rules', updateRule);

export const routeConfig = {
  path: '/automation',
  router: automationRouter,
};

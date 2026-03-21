import express from 'express';
import { burnToken } from './burn.controller.js';

const burnRouter = express.Router();

burnRouter.post('/execute', burnToken);

export const routeConfig = {
  path: '/burn',
  router: burnRouter,
};

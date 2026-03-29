import express from 'express';
import { scanSecurityController } from './security.controller.js';
import { validator } from '../../utils/validator.js';

const router = express.Router();

/**
 * @route   GET /api/v1/security/scan
  * @desc    Scans for risky contract approvals (URL-based lookup)
   */
  router.get('/scan', scanSecurityController);

   /**
   * @route   POST /api/v1/security/scan
   * @desc    Institutional Security Audit (JSON-body based)
   */
  router.post('/scan', scanSecurityController);
  
      export const routeConfig = {
      path: '/v1/security',
      router: router,
      isPublic: false,
      isCritical: true
                    };

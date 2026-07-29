import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { apiKeyAuth } from '../middlewares/apiKeyAuth.middleware.js';
import { publicApiLimiter } from '../middlewares/rateLimiter.middleware.js';
import { runAgentPublic } from '../controllers/publicAgent.controller.js';

const router = Router();

router.post(
  '/agents/:id/run',
  publicApiLimiter,
  asyncHandler(apiKeyAuth),
  asyncHandler(runAgentPublic),
);

export default router;

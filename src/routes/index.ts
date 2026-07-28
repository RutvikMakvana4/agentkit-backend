import { Router } from 'express';
import healthRoutes from './health.routes.js';
import agentRoutes from './agent.routes.js';
import toolRoutes from './tool.routes.js';
import executionRoutes from './execution.routes.js';
import apiKeyRoutes from './apiKey.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/agents', agentRoutes);
router.use('/tools', toolRoutes);
router.use('/executions', executionRoutes);
router.use('/api-keys', apiKeyRoutes);

export default router;

import { Router } from 'express';
import healthRoutes from './health.routes.js';
import agentRoutes from './agent.routes.js';
import toolRoutes from './tool.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/agents', agentRoutes);
router.use('/tools', toolRoutes);

// Mount new feature routers here, e.g.:
// router.use("/executions", executionRoutes);
// router.use("/api-keys", apiKeyRoutes);

export default router;

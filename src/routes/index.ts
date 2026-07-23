import { Router } from 'express';
import healthRoutes from './health.routes.js';

const router = Router();

router.use('/health', healthRoutes);

// Mount new feature routers here, e.g.:
// router.use("/users", userRoutes);

export default router;

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listTools } from '../controllers/tool.controller.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => listTools(req, res)));

export default router;

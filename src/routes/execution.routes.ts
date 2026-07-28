import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listExecutions, getExecution } from '../controllers/execution.controller.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => listExecutions(req, res)));
router.get('/:id', asyncHandler(async (req, res) => getExecution(req, res)));

export default router;

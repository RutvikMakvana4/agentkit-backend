import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listTools,
  listProjectTools,
  setToolEnabled,
  testTool,
} from '../controllers/tool.controller.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => listTools(req, res)));
router.get('/project/:projectId', asyncHandler(async (req, res) => listProjectTools(req, res)));
router.patch('/:id', asyncHandler(async (req, res) => setToolEnabled(req, res)));
router.post('/:id/test', asyncHandler(async (req, res) => testTool(req, res)));

export default router;

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createProject,
  listProjects,
  getCurrentProject,
  getProject,
  getConnectionStatus,
} from '../controllers/project.controller.js';

const router = Router();

router.post('/', asyncHandler(async (req, res) => createProject(req, res)));
router.get('/', asyncHandler(async (req, res) => listProjects(req, res)));
router.get('/current', asyncHandler(async (req, res) => getCurrentProject(req, res)));
router.get('/:id', asyncHandler(async (req, res) => getProject(req, res)));
router.get('/:id/connection-status', asyncHandler(async (req, res) => getConnectionStatus(req, res)));

export default router;

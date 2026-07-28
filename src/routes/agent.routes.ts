import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  chatWithAgent,
} from '../controllers/agent.controller.js';
import { listExecutionsForAgent } from '../controllers/execution.controller.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => listAgents(req, res)));
router.post('/', asyncHandler(async (req, res) => createAgent(req, res)));
router.get('/:id', asyncHandler(async (req, res) => getAgent(req, res)));
router.patch('/:id', asyncHandler(async (req, res) => updateAgent(req, res)));
router.delete('/:id', asyncHandler(async (req, res) => deleteAgent(req, res)));
router.post('/:id/chat', asyncHandler(chatWithAgent));
router.get('/:id/executions', asyncHandler(async (req, res) => listExecutionsForAgent(req, res)));

export default router;

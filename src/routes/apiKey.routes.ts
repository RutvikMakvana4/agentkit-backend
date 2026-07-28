import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
} from '../controllers/apiKey.controller.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => listApiKeys(req, res)));
router.post('/', asyncHandler(async (req, res) => createApiKey(req, res)));
router.delete('/:id', asyncHandler(async (req, res) => revokeApiKey(req, res)));

export default router;

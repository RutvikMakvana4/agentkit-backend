import type { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as apiKeyService from '../services/apiKey.service.js';
import * as agentService from '../services/agent.service.js';
import { createApiKeySchema } from '../validators/agent.validator.js';

export async function listApiKeys(_req: Request, res: Response) {
  const keys = await apiKeyService.listApiKeys();
  res.status(200).json(new ApiResponse(200, 'API keys fetched', keys));
}

export async function createApiKey(req: Request, res: Response) {
  const parsed = createApiKeySchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const agent = await agentService.getAgentById(parsed.data.agentId);
  if (!agent) throw ApiError.notFound(`Agent "${parsed.data.agentId}" not found`);

  const { apiKey, rawKey } = await apiKeyService.createApiKey(agent.id, parsed.data.label);

  // rawKey is only ever available in this one response — the DB only ever
  // stores its hash from this point on.
  res.status(201).json(new ApiResponse(201, 'API key created', { apiKey, rawKey }));
}

export async function revokeApiKey(req: Request, res: Response) {
  const revoked = await apiKeyService.revokeApiKey(req.params.id as string);
  if (!revoked) throw ApiError.notFound(`API key "${req.params.id as string}" not found`);
  res.status(200).json(new ApiResponse(200, 'API key revoked', { id: req.params.id }));
}

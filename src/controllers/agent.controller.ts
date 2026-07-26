import type { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as agentService from '../services/agent.service.js';
import { runAgent } from '../services/agentRunner.service.js';
import {
  createAgentSchema,
  updateAgentSchema,
  chatSchema,
} from '../validators/agent.validator.js';

export function listAgents(_req: Request, res: Response) {
  res
    .status(200)
    .json(new ApiResponse(200, 'Agents fetched', agentService.listAgents()));
}

export function getAgent(req: Request, res: Response) {
  const agent = agentService.getAgentById(req.params.id as string);
  if (!agent)
    throw ApiError.notFound(`Agent "${req.params.id as string}" not found`);
  res.status(200).json(new ApiResponse(200, 'Agent fetched', agent));
}

export function createAgent(req: Request, res: Response) {
  const parsed = createAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      parsed.error.issues.map((i) => i.message).join(', '),
    );
  }
  const agent = agentService.createAgent(parsed.data);
  res.status(201).json(new ApiResponse(201, 'Agent created', agent));
}

export function updateAgent(req: Request, res: Response) {
  const parsed = updateAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      parsed.error.issues.map((i) => i.message).join(', '),
    );
  }
  const agent = agentService.updateAgent(req.params.id as string, parsed.data);
  if (!agent)
    throw ApiError.notFound(`Agent "${req.params.id as string}" not found`);
  res.status(200).json(new ApiResponse(200, 'Agent updated', agent));
}

export function deleteAgent(req: Request, res: Response) {
  const deleted = agentService.deleteAgent(req.params.id as string);
  if (!deleted)
    throw ApiError.notFound(`Agent "${req.params.id as string}" not found`);
  res
    .status(200)
    .json(
      new ApiResponse(200, 'Agent deleted', { id: req.params.id as string }),
    );
}

export async function chatWithAgent(req: Request, res: Response) {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      parsed.error.issues.map((i) => i.message).join(', '),
    );
  }

  const agent = agentService.getAgentById(req.params.id as string);
  if (!agent)
    throw ApiError.notFound(`Agent "${req.params.id as string}" not found`);

  const result = await runAgent(agent, parsed.data.message);
  res.status(200).json(new ApiResponse(200, 'Agent run completed', result));
}

import type { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as agentService from '../services/agent.service.js';
import { runAgent } from '../services/agentRunner.service.js';
import * as executionService from '../services/execution.service.js';
import {
  createAgentSchema,
  updateAgentSchema,
  chatSchema,
} from '../validators/agent.validator.js';

export async function listAgents(_req: Request, res: Response) {
  const agents = await agentService.listAgents();
  res.status(200).json(new ApiResponse(200, 'Agents fetched', agents));
}

export async function getAgent(req: Request, res: Response) {
  const agent = await agentService.getAgentById(req.params.id as string);
  if (!agent) throw ApiError.notFound(`Agent "${req.params.id as string}" not found`);
  res.status(200).json(new ApiResponse(200, 'Agent fetched', agent));
}

export async function createAgent(req: Request, res: Response) {
  const parsed = createAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }
  const agent = await agentService.createAgent(parsed.data);
  res.status(201).json(new ApiResponse(201, 'Agent created', agent));
}

export async function updateAgent(req: Request, res: Response) {
  const parsed = updateAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }
  const agent = await agentService.updateAgent(req.params.id as string, parsed.data);
  if (!agent) throw ApiError.notFound(`Agent "${req.params.id as string}" not found`);
  res.status(200).json(new ApiResponse(200, 'Agent updated', agent));
}

export async function deleteAgent(req: Request, res: Response) {
  const deleted = await agentService.deleteAgent(req.params.id as string);
  if (!deleted) throw ApiError.notFound(`Agent "${req.params.id as string}" not found`);
  res.status(200).json(new ApiResponse(200, 'Agent deleted', { id: req.params.id }));
}

export async function chatWithAgent(req: Request, res: Response) {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const agent = await agentService.getAgentById(req.params.id as string);
  if (!agent) throw ApiError.notFound(`Agent "${req.params.id as string}" not found`);

  const result = await runAgent(agent, parsed.data.message);
  const execution = await executionService.recordExecution(agent.id, parsed.data.message, result);

  if (result.status === 'error') {
    throw ApiError.internal(result.error ?? 'Agent run failed');
  }

  res.status(200).json(new ApiResponse(200, 'Agent run completed', execution));
}

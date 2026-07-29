import type { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as agentService from '../services/agent.service.js';
import { runAgent } from '../services/agentRunner.service.js';
import * as executionService from '../services/execution.service.js';
import * as conversationService from '../services/conversation.service.js';
import type { AgentEvent } from '../types/agent.types.js';
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

  const conversationId = await conversationService.ensureConversation(
    agent.id,
    parsed.data.conversationId,
  );
  const history = await conversationService.getConversationHistory(conversationId);

  const result = await runAgent(agent, parsed.data.message, { history });

  await conversationService.appendTurn(
    conversationId,
    parsed.data.message,
    result.status === 'success' ? result.reply : undefined,
  );
  const execution = await executionService.recordExecution(
    agent.id,
    parsed.data.message,
    result,
    conversationId,
  );

  if (result.status === 'error') {
    throw ApiError.internal(result.error ?? 'Agent run failed');
  }

  res.status(200).json(new ApiResponse(200, 'Agent run completed', execution));
}

export async function chatWithAgentStream(req: Request, res: Response) {
  // EventSource (and GET requests generally) can't carry a JSON body, so the
  // message travels as a query param here — the non-streaming POST endpoint
  // above is what takes it in the body.
  const parsed = chatSchema.safeParse(req.query);
  if (!parsed.success) {
    throw ApiError.badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const agent = await agentService.getAgentById(req.params.id as string);
  if (!agent) throw ApiError.notFound(`Agent "${req.params.id as string}" not found`);

  const conversationId = await conversationService.ensureConversation(
    agent.id,
    parsed.data.conversationId,
  );
  const history = await conversationService.getConversationHistory(conversationId);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // disable nginx response buffering, if present
  });

  // Extra frame beyond the frontend's current AgentEvent union — safe to
  // ignore today, lets a future multi-turn playground pick up the id to
  // send back on the next message.
  res.write(`event: conversation_started\n`);
  res.write(`data: ${JSON.stringify({ conversationId })}\n\n`);

  function send(event: AgentEvent) {
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  const controller = new AbortController();
  req.on('close', () => controller.abort());

  const result = await runAgent(agent, parsed.data.message, {
    history,
    onEvent: send,
    signal: controller.signal,
  });

  await conversationService.appendTurn(
    conversationId,
    parsed.data.message,
    result.status === 'success' ? result.reply : undefined,
  );

  // Still record the run even if the client disconnected mid-stream — the
  // trace is useful for debugging regardless of whether anyone saw it live.
  await executionService.recordExecution(agent.id, parsed.data.message, result, conversationId);

  res.end();
}

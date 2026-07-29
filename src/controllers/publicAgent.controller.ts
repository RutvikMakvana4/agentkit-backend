import type { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as agentService from '../services/agent.service.js';
import { runAgent } from '../services/agentRunner.service.js';
import * as executionService from '../services/execution.service.js';
import * as conversationService from '../services/conversation.service.js';
import { chatSchema } from '../validators/agent.validator.js';

export async function runAgentPublic(req: Request, res: Response) {
  const agentIdFromUrl = req.params.id as string;

  // The API key resolved to a specific agent (set by apiKeyAuth) — make sure
  // it's actually being used against the agent it was issued for, not
  // borrowed to run a different one.
  if (req.agentId !== agentIdFromUrl) {
    throw ApiError.forbidden('This API key is not authorized for this agent');
  }

  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const agent = await agentService.getAgentById(agentIdFromUrl);
  if (!agent) throw ApiError.notFound(`Agent "${agentIdFromUrl}" not found`);

  if (agent.status !== 'active') {
    throw ApiError.forbidden('This agent is deactivated');
  }

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

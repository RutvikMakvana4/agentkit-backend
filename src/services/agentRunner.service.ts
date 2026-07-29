import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { env } from '../config/env.js';
import { callLlm } from './llm.service.js';
import { toolRegistry } from '../tools/index.js';
import type { Agent, AgentEvent, AgentRunResult, ToolCallTrace } from '../types/agent.types.js';

const MAX_AGENT_ITERATIONS = env.MAX_AGENT_ITERATIONS;

function withTimeout<T>(promise: Promise<T>, ms: number, toolName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Tool "${toolName}" timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export interface RunAgentOptions {
  /** Prior turns of this conversation, oldest first — prepended before the new user message. */
  history?: { role: 'user' | 'assistant'; content: string }[];
  /** Called for every step of the loop — used to stream progress over SSE. */
  onEvent?: (event: AgentEvent) => void;
  /** Lets an SSE client disconnect actually cancel the in-flight OpenAI call. */
  signal?: AbortSignal;
}

export async function runAgent(
  agent: Agent,
  userMessage: string,
  options: RunAgentOptions = {},
): Promise<AgentRunResult> {
  const emit = options.onEvent ?? (() => {});
  const start = Date.now();
  const toolNames = agent.tools.map((t) => t.toolName);
  const openAiTools = toolRegistry.toOpenAITools(toolNames);

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: agent.instructions },
    ...(options.history ?? []).map(
      (turn): ChatCompletionMessageParam => ({ role: turn.role, content: turn.content }),
    ),
    { role: 'user', content: userMessage },
  ];

  const toolCallTraces: ToolCallTrace[] = [];
  let totalTokens = 0;
  let iterations = 0;

  emit({ type: 'agent_started' });

  while (iterations < MAX_AGENT_ITERATIONS) {
    iterations += 1;

    if (options.signal?.aborted) {
      return {
        status: 'error',
        reply: '',
        error: 'Client disconnected',
        toolCalls: toolCallTraces,
        latencyMs: Date.now() - start,
        tokens: totalTokens,
        iterations,
      };
    }

    emit({ type: 'llm_started' });

    let result;
    try {
      result = await callLlm({
        model: agent.model,
        temperature: agent.temperature,
        messages,
        tools: openAiTools,
        signal: options.signal,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'LLM request failed';
      emit({ type: 'error', message });
      return {
        status: 'error',
        reply: '',
        error: message,
        toolCalls: toolCallTraces,
        latencyMs: Date.now() - start,
        tokens: totalTokens,
        iterations,
      };
    }

    totalTokens += result.usage.totalTokens;

    if (result.toolCalls.length === 0) {
      const reply = result.content ?? '';

      // We call OpenAI non-streaming (simpler, and matches the PRD's loop
      // pseudocode exactly), so there's no real token-by-token stream to
      // relay. Instead we reveal the finished reply progressively — same
      // pacing the frontend's simulator already uses, so the playground UI
      // doesn't need to change when this replaces it. Swap this for true
      // OpenAI token streaming later if you want first-token latency to drop.
      for (const word of reply.split(' ')) {
        emit({ type: 'message_delta', delta: `${word} ` });
        await new Promise((resolve) => setTimeout(resolve, 40));
      }

      emit({ type: 'llm_completed' });
      emit({
        type: 'agent_completed',
        latencyMs: Date.now() - start,
        tokens: totalTokens,
        toolCallCount: toolCallTraces.length,
      });

      return {
        status: 'success',
        reply,
        toolCalls: toolCallTraces,
        latencyMs: Date.now() - start,
        tokens: totalTokens,
        iterations,
      };
    }

    messages.push({
      role: 'assistant',
      content: result.content,
      tool_calls: result.toolCalls.map((call) => ({
        id: call.id,
        type: 'function',
        function: {
          name: call.name,
          arguments: JSON.stringify(call.arguments),
        },
      })),
    });

    for (const call of result.toolCalls) {
      emit({ type: 'tool_started', name: call.name, arguments: call.arguments });
      const callStart = Date.now();

      try {
        const toolResult = await withTimeout(
          toolRegistry.execute(call.name, call.arguments),
          env.TOOL_EXECUTION_TIMEOUT_MS,
          call.name,
        );
        const durationMs = Date.now() - callStart;

        toolCallTraces.push({
          id: call.id,
          name: call.name,
          arguments: call.arguments,
          result: toolResult,
          durationMs,
          status: 'success',
        });

        emit({ type: 'tool_completed', name: call.name, durationMs, result: toolResult });

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(toolResult),
        });
      } catch (err) {
        const durationMs = Date.now() - callStart;
        const errorMessage = err instanceof Error ? err.message : 'Tool execution failed';

        toolCallTraces.push({
          id: call.id,
          name: call.name,
          arguments: call.arguments,
          durationMs,
          status: 'error',
          error: errorMessage,
        });

        emit({ type: 'tool_completed', name: call.name, durationMs, result: { error: errorMessage } });

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ error: errorMessage }),
        });
      }
    }
  }

  const message = 'Maximum agent iterations reached';
  emit({ type: 'error', message });

  return {
    status: 'error',
    reply: '',
    error: message,
    toolCalls: toolCallTraces,
    latencyMs: Date.now() - start,
    tokens: totalTokens,
    iterations,
  };
}

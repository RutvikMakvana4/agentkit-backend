import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { env } from '../config/env.js';
import { callLlm } from './llm.service.js';
import { toolRegistry } from '../tools/index.js';
import type { Agent, AgentRunResult, ToolCallTrace } from '../types/agent.types.js';

const MAX_AGENT_ITERATIONS = env.MAX_AGENT_ITERATIONS;

function withTimeout<T>(promise: Promise<T>, ms: number, toolName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Tool "${toolName}" timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export async function runAgent(agent: Agent, userMessage: string): Promise<AgentRunResult> {
  const start = Date.now();
  const toolNames = agent.tools.map((t) => t.toolName);
  const openAiTools = toolRegistry.toOpenAITools(toolNames);

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: agent.instructions },
    { role: 'user', content: userMessage },
  ];

  const toolCallTraces: ToolCallTrace[] = [];
  let totalTokens = 0;
  let iterations = 0;

  while (iterations < MAX_AGENT_ITERATIONS) {
    iterations += 1;

    let result;
    try {
      result = await callLlm({
        model: agent.model,
        temperature: agent.temperature,
        messages,
        tools: openAiTools,
      });
    } catch (err) {
      // Network/API failure talking to the LLM — return whatever trace we
      // have so far as a failed execution, rather than throwing and losing it.
      return {
        status: 'error',
        reply: '',
        error: err instanceof Error ? err.message : 'LLM request failed',
        toolCalls: toolCallTraces,
        latencyMs: Date.now() - start,
        tokens: totalTokens,
        iterations,
      };
    }

    totalTokens += result.usage.totalTokens;

    if (result.toolCalls.length === 0) {
      return {
        status: 'success',
        reply: result.content ?? '',
        toolCalls: toolCallTraces,
        latencyMs: Date.now() - start,
        tokens: totalTokens,
        iterations,
      };
    }

    // Record the assistant's tool-call request in the conversation.
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

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ error: errorMessage }),
        });
      }
    }
  }

  return {
    status: 'error',
    reply: '',
    error: 'Maximum agent iterations reached',
    toolCalls: toolCallTraces,
    latencyMs: Date.now() - start,
    tokens: totalTokens,
    iterations,
  };
}

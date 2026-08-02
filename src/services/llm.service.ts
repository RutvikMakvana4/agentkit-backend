import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { env } from '../config/env.js';

const client = new OpenAI({
  apiKey: env.LLM_API_KEY ?? env.OPENAI_API_KEY,
  ...(env.LLM_BASE_URL ? { baseURL: env.LLM_BASE_URL } : {}),
});

export interface LlmCallInput {
  model: string;
  temperature: number;
  messages: ChatCompletionMessageParam[];
  tools?: ChatCompletionTool[];
  signal?: AbortSignal;
}

export interface LlmCallResult {
  content: string | null;
  toolCalls: {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function callLlm(input: LlmCallInput): Promise<LlmCallResult> {
  const completion = await client.chat.completions.create(
    {
      model: input.model,
      temperature: input.temperature,
      messages: input.messages,
      ...(input.tools && input.tools.length > 0 ? { tools: input.tools } : {}),
    },
    { signal: input.signal },
  );

  const choice = completion.choices[0];
  const message = choice?.message;

  const toolCalls =
    message?.tool_calls
      ?.filter((call) => call.type === 'function')
      .map((call) => ({
        id: call.id,
        name: call.function.name,
        arguments: safeParseJson(call.function.arguments),
      })) ?? [];

  return {
    content: message?.content ?? null,
    toolCalls,
    usage: {
      promptTokens: completion.usage?.prompt_tokens ?? 0,
      completionTokens: completion.usage?.completion_tokens ?? 0,
      totalTokens: completion.usage?.total_tokens ?? 0,
    },
  };
}

function safeParseJson(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

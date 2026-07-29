import { prisma } from '../config/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import type { ExecutionModel } from '../generated/prisma/models/Execution.js';
import type { ToolCallModel } from '../generated/prisma/models/ToolCall.js';
import type {
  AgentRunResult,
  Execution,
  ExecutionStatus,
  ToolCallTrace,
} from '../types/agent.types.js';

type ExecutionWithToolCalls = ExecutionModel & { toolCalls: ToolCallModel[] };

function toExecution(
  row: ExecutionWithToolCalls,
  agentName: string,
): Execution {
  return {
    id: row.id,
    agentId: row.agentId,
    agentName,
    conversationId: row.conversationId ?? undefined,
    status: row.status as ExecutionStatus,
    input: row.input,
    output: row.output ?? undefined,
    error: row.error ?? undefined,
    latencyMs: row.latencyMs,
    tokens: row.tokens,
    toolCalls: row.toolCalls.map(
      (call): ToolCallTrace => ({
        id: call.id,
        name: call.name,
        arguments: call.arguments as Record<string, unknown>,
        result: call.result ?? undefined,
        durationMs: call.durationMs,
        status: call.status as 'success' | 'error',
        error: call.error ?? undefined,
      }),
    ),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function recordExecution(
  agentId: string,
  input: string,
  result: AgentRunResult,
  conversationId?: string,
): Promise<Execution> {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });

  const row = await prisma.execution.create({
    data: {
      agentId,
      conversationId: conversationId ?? null,
      status: result.status,
      input,
      output: result.reply || null,
      error: result.error ?? null,
      latencyMs: result.latencyMs,
      tokens: result.tokens,
      toolCalls: {
        create: result.toolCalls.map((call) => ({
          name: call.name,
          arguments: call.arguments as Prisma.InputJsonValue,
          result:
            call.result === null || call.result === undefined
              ? Prisma.JsonNull
              : (call.result as Prisma.InputJsonValue),
          durationMs: call.durationMs,
          status: call.status,
          error: call.error ?? null,
        })),
      },
    },
    include: { toolCalls: true },
  });

  return toExecution(row, agent?.name ?? 'Unknown agent');
}

export async function listExecutions(): Promise<Execution[]> {
  const rows = await prisma.execution.findMany({
    include: { toolCalls: true, agent: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((row) => toExecution(row, row.agent.name));
}

export async function listExecutionsByAgent(
  agentId: string,
): Promise<Execution[]> {
  const rows = await prisma.execution.findMany({
    where: { agentId },
    include: { toolCalls: true, agent: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((row) => toExecution(row, row.agent.name));
}

export async function getExecutionById(
  id: string,
): Promise<Execution | undefined> {
  const row = await prisma.execution.findUnique({
    where: { id },
    include: { toolCalls: true, agent: { select: { name: true } } },
  });
  return row ? toExecution(row, row.agent.name) : undefined;
}

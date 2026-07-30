import { prisma } from '../config/prisma.js';
import type { ProjectTool, JsonSchema } from '../types/project.types.js';

interface ToolRow {
  id: string;
  projectId: string;
  name: string;
  description: string;
  inputSchema: unknown;
  outputExample: unknown;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

async function withStats(row: ToolRow): Promise<ProjectTool> {
  const calls = await prisma.toolCall.findMany({
    where: { name: row.name },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { durationMs: true, status: true, error: true },
  });

  const durations = calls.map((c) => c.durationMs).sort((a, b) => a - b);
  const pct = (p: number) =>
    durations.length === 0 ? undefined : durations[Math.floor((durations.length - 1) * p)];

  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    description: row.description,
    inputSchema: (row.inputSchema ?? { type: 'object', properties: {} }) as JsonSchema,
    outputExample: row.outputExample ?? undefined,
    enabled: row.enabled,
    latencyP50Ms: pct(0.5),
    latencyP95Ms: pct(0.95),
    lastStatus: calls[0]?.status,
    lastError: calls[0]?.error ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listToolsForProject(projectId: string): Promise<ProjectTool[]> {
  const rows = await prisma.tool.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });
  return Promise.all(rows.map(withStats));
}

export async function getEnabledToolNamesForProject(projectId: string): Promise<string[]> {
  const rows = await prisma.tool.findMany({
    where: { projectId, enabled: true },
    select: { name: true },
  });
  return rows.map((r) => r.name);
}

export async function findToolByName(projectId: string, name: string) {
  return prisma.tool.findUnique({ where: { projectId_name: { projectId, name } } });
}

/** Called by the WS gateway on a `register_tool` message from the SDK (§15.2). */
export async function upsertToolFromSdk(
  projectId: string,
  input: { name: string; description: string; inputSchema: JsonSchema },
) {
  return prisma.tool.upsert({
    where: { projectId_name: { projectId, name: input.name } },
    create: {
      projectId,
      name: input.name,
      description: input.description,
      inputSchema: input.inputSchema as object,
    },
    update: {
      description: input.description,
      inputSchema: input.inputSchema as object,
    },
  });
}

/** Called after the first successful real execution to capture a sample output (§10.2). */
export async function recordOutputExample(projectId: string, name: string, output: unknown) {
  await prisma.tool
    .update({
      where: { projectId_name: { projectId, name } },
      data: { outputExample: output as object },
    })
    .catch(() => undefined);
}

export async function setToolEnabled(toolId: string, enabled: boolean): Promise<ProjectTool | undefined> {
  const row = await prisma.tool.update({ where: { id: toolId }, data: { enabled } }).catch(() => undefined);
  return row ? withStats(row) : undefined;
}

export async function getToolById(toolId: string) {
  return prisma.tool.findUnique({ where: { id: toolId } });
}

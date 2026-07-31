import { prisma } from '../config/prisma.js';
import type { AgentModel } from '../generated/prisma/models/Agent.js';
import type { Agent, AgentStatus, AgentTool } from '../types/agent.types.js';
import { ApiError } from '../utils/ApiError.js';
import { toolRegistry } from '../tools/index.js';
import { getLatestProject } from './project.service.js';
import { listToolsForProject } from './tool.service.js';

export interface CreateAgentInput {
  name: string;
  description: string;
  instructions: string;
  model: string;
  temperature: number;
  status?: AgentStatus;
  tools: AgentTool[];
}

export type UpdateAgentInput = Partial<CreateAgentInput>;

function toAgent(row: AgentModel): Agent {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    instructions: row.instructions,
    model: row.model,
    temperature: row.temperature,
    status: row.status as AgentStatus,
    tools: (row.tools as unknown as AgentTool[]) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * §18.2 — validates `tools[]` against real tools instead of trusting
 * whatever (toolId, toolName) pairs the client sends. An agent may
 * reference either a built-in demo tool (available even with no backend
 * connected — the Playground's "try it without connecting anything" mode,
 * §15.4) or a tool the SDK actually registered for the current project.
 * Disabled project tools are deliberately excluded — matches §10.2's
 * "disabling removes it from the schema sent to OpenAI for any agent".
 */
async function assertToolsAreValid(tools: AgentTool[]): Promise<void> {
  if (tools.length === 0) return;

  const validByName = new Map<string, string>(); // name -> id
  for (const demoTool of toolRegistry.list()) {
    validByName.set(demoTool.name, demoTool.id);
  }

  const project = await getLatestProject();
  if (project) {
    const projectTools = await listToolsForProject(project.id);
    for (const tool of projectTools) {
      if (tool.enabled) validByName.set(tool.name, tool.id);
    }
  }

  const invalid = tools.filter((t) => validByName.get(t.toolName) !== t.toolId);
  if (invalid.length > 0) {
    const names = invalid.map((t) => t.toolName).join(', ');
    throw ApiError.badRequest(
      `Unknown or disabled tool(s): ${names}. Tools must be registered (and enabled) either as a built-in demo tool or via the connected backend's SDK.`,
    );
  }
}

export async function listAgents(): Promise<Agent[]> {
  const rows = await prisma.agent.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(toAgent);
}

export async function getAgentById(id: string): Promise<Agent | undefined> {
  const row = await prisma.agent.findUnique({ where: { id } });
  return row ? toAgent(row) : undefined;
}

export async function createAgent(input: CreateAgentInput): Promise<Agent> {
  await assertToolsAreValid(input.tools);

  const row = await prisma.agent.create({
    data: {
      name: input.name,
      description: input.description,
      instructions: input.instructions,
      model: input.model,
      temperature: input.temperature,
      status: input.status ?? 'active',
      tools: input.tools as unknown as object,
    },
  });
  return toAgent(row);
}

export async function updateAgent(
  id: string,
  patch: UpdateAgentInput,
): Promise<Agent | undefined> {
  if (patch.tools !== undefined) {
    await assertToolsAreValid(patch.tools);
  }

  try {
    const row = await prisma.agent.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.description !== undefined
          ? { description: patch.description }
          : {}),
        ...(patch.instructions !== undefined
          ? { instructions: patch.instructions }
          : {}),
        ...(patch.model !== undefined ? { model: patch.model } : {}),
        ...(patch.temperature !== undefined
          ? { temperature: patch.temperature }
          : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.tools !== undefined
          ? { tools: patch.tools as unknown as object }
          : {}),
      },
    });
    return toAgent(row);
  } catch {
    // Prisma throws P2025 when the record doesn't exist — surface as undefined,
    // same contract the in-memory version had, so the controller's 404 logic
    // doesn't need to change.
    return undefined;
  }
}

export async function deleteAgent(id: string): Promise<boolean> {
  try {
    await prisma.agent.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

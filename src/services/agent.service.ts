import { prisma } from '../config/prisma.js';
import type { AgentModel } from '../generated/prisma/models/Agent.js';
import type { Agent, AgentStatus, AgentTool } from '../types/agent.types.js';

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

export async function listAgents(): Promise<Agent[]> {
  const rows = await prisma.agent.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(toAgent);
}

export async function getAgentById(id: string): Promise<Agent | undefined> {
  const row = await prisma.agent.findUnique({ where: { id } });
  return row ? toAgent(row) : undefined;
}

export async function createAgent(input: CreateAgentInput): Promise<Agent> {
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
  try {
    const row = await prisma.agent.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.instructions !== undefined ? { instructions: patch.instructions } : {}),
        ...(patch.model !== undefined ? { model: patch.model } : {}),
        ...(patch.temperature !== undefined ? { temperature: patch.temperature } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.tools !== undefined ? { tools: patch.tools as unknown as object } : {}),
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

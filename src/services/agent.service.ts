import { randomUUID } from 'node:crypto';
import type { Agent, AgentStatus, AgentTool } from '../types/agent.types.js';

const agents: Agent[] = [
  {
    id: 'agent_customer_support',
    name: 'Customer Support Agent',
    description: 'Handles order status and support ticket questions',
    instructions: 'You are a helpful customer support agent.',
    model: 'gpt-4.1-mini',
    temperature: 0.3,
    status: 'active',
    tools: [{ toolId: 'tool_getOrder', toolName: 'getOrder' }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

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

export function listAgents(): Agent[] {
  return agents;
}

export function getAgentById(id: string): Agent | undefined {
  return agents.find((a) => a.id === id);
}

export function createAgent(input: CreateAgentInput): Agent {
  const now = new Date().toISOString();
  const agent: Agent = {
    id: `agent_${randomUUID()}`,
    status: 'active',
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  agents.unshift(agent);
  return agent;
}

export function updateAgent(id: string, patch: UpdateAgentInput): Agent | undefined {
  const index = agents.findIndex((a) => a.id === id);
  if (index === -1) return undefined;

  const updated: Agent = {
    ...agents[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  agents[index] = updated;
  return updated;
}

export function deleteAgent(id: string): boolean {
  const index = agents.findIndex((a) => a.id === id);
  if (index === -1) return false;
  agents.splice(index, 1);
  return true;
}

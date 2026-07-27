export type AgentStatus = 'active' | 'inactive';

export interface AgentTool {
  toolId: string;
  toolName: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  instructions: string;
  model: string;
  temperature: number;
  status: AgentStatus;
  tools: AgentTool[];
  createdAt: string;
  updatedAt: string;
}

export type ToolPermission = 'read' | 'write';

export interface JsonSchemaObject {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  permission: ToolPermission;
  parameters: JsonSchemaObject;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface ToolCallTrace {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  durationMs: number;
  status: 'success' | 'error';
  error?: string;
}

export interface AgentRunResult {
  status: 'success' | 'error';
  reply: string;
  error?: string;
  toolCalls: ToolCallTrace[];
  latencyMs: number;
  tokens: number;
  iterations: number;
}

export type ExecutionStatus = 'running' | 'success' | 'error';

export interface Execution {
  id: string;
  agentId: string;
  agentName: string;
  status: ExecutionStatus;
  input: string;
  output?: string;
  error?: string;
  latencyMs: number;
  tokens: number;
  toolCalls: ToolCallTrace[];
  createdAt: string;
}

export interface ApiKey {
  id: string;
  agentId: string;
  agentName: string;
  label: string;
  keyPreview: string;
  createdAt: string;
  lastUsedAt?: string;
}

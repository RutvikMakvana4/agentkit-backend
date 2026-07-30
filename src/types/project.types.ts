export type ConnectionStatus = 'connected' | 'stale' | 'disconnected';

export interface Project {
  id: string;
  name: string;
  framework?: string | null;
  nodeVersion?: string | null;
  sdkVersion?: string | null;
  status: ConnectionStatus;
  lastSeenAt?: string;
  toolCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface JsonSchema {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface ProjectTool {
  id: string;
  projectId: string;
  name: string;
  description: string;
  inputSchema: JsonSchema;
  outputExample?: unknown;
  enabled: boolean;
  latencyP50Ms?: number;
  latencyP95Ms?: number;
  lastStatus?: 'success' | 'error';
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

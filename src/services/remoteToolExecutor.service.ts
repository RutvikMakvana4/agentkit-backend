import { randomUUID } from 'node:crypto';
import { connectionRegistry } from '../ws/connectionRegistry.js';
import { recordOutputExample } from './tool.service.js';
import { env } from '../config/env.js';

interface PendingCall {
  resolve: (result: unknown) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

// Request/response correlation (§15.3) — every invocation carries a
// requestId so concurrent tool calls (e.g. two Playground sessions) don't
// cross-talk on the same socket.
const pending = new Map<string, PendingCall>();

export function resolvePendingCall(requestId: string, result: unknown, error?: string) {
  const call = pending.get(requestId);
  if (!call) return; // late/duplicate response — ignore
  clearTimeout(call.timer);
  pending.delete(requestId);
  if (error) call.reject(new Error(error));
  else call.resolve(result);
}

export class RemoteToolError extends Error {}

/**
 * Executes a tool that lives in the developer's own process, over the
 * project's live WebSocket connection (§15). Used both by the agent runner
 * loop and by the Tools page's "Run test call" action (§10.2).
 */
export async function executeRemoteTool(
  projectId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const socket = connectionRegistry.get(projectId);
  if (!socket || socket.readyState !== socket.OPEN) {
    throw new RemoteToolError(
      `Backend is not connected — no live SDK connection for this project`,
    );
  }

  const requestId = randomUUID();

  const result = await new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      reject(new RemoteToolError(`Tool "${toolName}" timed out after ${env.TOOL_EXECUTION_TIMEOUT_MS}ms`));
    }, env.TOOL_EXECUTION_TIMEOUT_MS);

    pending.set(requestId, { resolve, reject, timer });

    socket.send(
      JSON.stringify({ type: 'tool_invoke', requestId, name: toolName, arguments: args }),
    );
  });

  // Best-effort — captures a sample response shape for the Tools page
  // (§10.2 Output/Example column). Never block/fail the caller on this.
  recordOutputExample(projectId, toolName, result).catch(() => undefined);

  return result;
}

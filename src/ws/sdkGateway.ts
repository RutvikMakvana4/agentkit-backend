import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { logger } from '../utils/logger.js';
import { connectionRegistry } from './connectionRegistry.js';
import { verifyProjectKey, markConnected, markHeartbeat, markDisconnected } from '../services/project.service.js';
import { upsertToolFromSdk } from '../services/tool.service.js';
import { resolvePendingCall } from '../services/remoteToolExecutor.service.js';

// Missed-heartbeat window — matches project.service.ts's STALE_AFTER_MS
// story: if we haven't heard a heartbeat/message in this long, the socket
// is considered dead and force-closed so the registry stays accurate.
const HEARTBEAT_TIMEOUT_MS = 30_000;

type InboundMessage =
  | { type: 'register_tool'; name: string; description: string; inputSchema: Record<string, unknown> }
  | { type: 'heartbeat' }
  | { type: 'tool_result'; requestId: string; result?: unknown; error?: string };

function send(socket: WebSocket, payload: Record<string, unknown>) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

export function attachSdkGateway(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/ws/sdk' });

  wss.on('connection', async (socket, request) => {
    const url = new URL(request.url ?? '', 'http://internal');
    const projectKey = url.searchParams.get('projectKey');

    if (!projectKey) {
      socket.close(4001, 'Missing projectKey');
      return;
    }

    const projectId = await verifyProjectKey(projectKey);
    if (!projectId) {
      socket.close(4003, 'Invalid project key');
      return;
    }

    connectionRegistry.set(projectId, socket);
    await markConnected(projectId, parseConnectMeta(request));

    let staleTimer: NodeJS.Timeout;
    function resetStaleTimer() {
      clearTimeout(staleTimer);
      staleTimer = setTimeout(() => {
        logger.info('SDK connection missed heartbeat window, closing', { projectId });
        socket.close(4008, 'Heartbeat timeout');
      }, HEARTBEAT_TIMEOUT_MS);
    }
    resetStaleTimer();

    logger.info('SDK connected', { projectId });
    send(socket, { type: 'connected', projectId });

    socket.on('message', async (raw) => {
      resetStaleTimer();

      let message: InboundMessage;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        send(socket, { type: 'error', message: 'Malformed JSON message' });
        return;
      }

      switch (message.type) {
        case 'register_tool': {
          try {
            await upsertToolFromSdk(projectId, {
              name: message.name,
              description: message.description,
              inputSchema: message.inputSchema,
            });
            send(socket, { type: 'tool_registered', name: message.name });
          } catch (err) {
            send(socket, {
              type: 'error',
              message: err instanceof Error ? err.message : 'Failed to register tool',
            });
          }
          break;
        }

        case 'heartbeat': {
          await markHeartbeat(projectId);
          send(socket, { type: 'heartbeat_ack' });
          break;
        }

        case 'tool_result': {
          resolvePendingCall(message.requestId, message.result, message.error);
          break;
        }

        default:
          send(socket, { type: 'error', message: `Unknown message type` });
      }
    });

    socket.on('close', () => {
      clearTimeout(staleTimer);
      connectionRegistry.delete(projectId, socket);
      markDisconnected(projectId).catch(() => undefined);
      logger.info('SDK disconnected', { projectId });
    });

    socket.on('error', (err) => {
      logger.error('SDK socket error', { projectId, error: err.message });
    });
  });

  logger.info('SDK WebSocket gateway attached at /ws/sdk');
  return wss;
}

// Metadata (framework/nodeVersion/sdkVersion) arrives on connect via a
// query param instead of a first message, so it's known even before any
// tool is registered — kept in a tiny helper so sdkGateway.ts's main flow
// above stays readable.
export function parseConnectMeta(request: { url?: string }) {
  const url = new URL(request.url ?? '', 'http://internal');
  return {
    framework: url.searchParams.get('framework') ?? undefined,
    nodeVersion: url.searchParams.get('nodeVersion') ?? undefined,
    sdkVersion: url.searchParams.get('sdkVersion') ?? undefined,
  };
}

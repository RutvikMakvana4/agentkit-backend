import type { WebSocket } from 'ws';

class ConnectionRegistry {
  private connections = new Map<string, WebSocket>();

  set(projectId: string, socket: WebSocket) {
    // A new connection for the same project replaces the old one (e.g. a
    // dev server restart) — close the stale socket so it doesn't linger.
    const existing = this.connections.get(projectId);
    if (existing && existing !== socket) {
      existing.close(4000, 'Replaced by a newer connection');
    }
    this.connections.set(projectId, socket);
  }

  get(projectId: string): WebSocket | undefined {
    return this.connections.get(projectId);
  }

  delete(projectId: string, socket: WebSocket) {
    // Only clear the registry entry if it still points at *this* socket —
    // avoids a slow-closing old socket wiping out a brand-new connection.
    if (this.connections.get(projectId) === socket) {
      this.connections.delete(projectId);
    }
  }

  isConnected(projectId: string): boolean {
    const socket = this.connections.get(projectId);
    return socket !== undefined && socket.readyState === socket.OPEN;
  }
}

export const connectionRegistry = new ConnectionRegistry();

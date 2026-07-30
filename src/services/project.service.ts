import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import type { Project, ConnectionStatus } from '../types/project.types.js';

// Same pattern as apiKey.service.ts's generateRawKey/hashKey (§16 reuse
// note): hash it, show the raw value once, never persist the raw value.
function generateRawProjectKey(): string {
  return `pk_live_${randomBytes(24).toString('base64url')}`;
}

function hashProjectKey(rawKey: string): string {
  return createHash('sha256').update(rawKey + env.API_KEY_HASH_SECRET).digest('hex');
}

// A heartbeat older than this is considered stale even if the WS socket
// hasn't formally closed yet (e.g. a process was killed -9 mid-connection).
const STALE_AFTER_MS = 20_000;

interface ProjectRow {
  id: string;
  name: string;
  framework: string | null;
  nodeVersion: string | null;
  sdkVersion: string | null;
  status: ConnectionStatus;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { tools: number };
}

function toProject(row: ProjectRow): Project {
  const status = deriveLiveStatus(row.status, row.lastSeenAt);
  return {
    id: row.id,
    name: row.name,
    framework: row.framework,
    nodeVersion: row.nodeVersion,
    sdkVersion: row.sdkVersion,
    status,
    lastSeenAt: row.lastSeenAt?.toISOString(),
    toolCount: row._count?.tools ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function deriveLiveStatus(stored: ConnectionStatus, lastSeenAt: Date | null): ConnectionStatus {
  if (stored === 'disconnected') return 'disconnected';
  if (!lastSeenAt) return 'disconnected';
  const age = Date.now() - lastSeenAt.getTime();
  if (age > STALE_AFTER_MS) return 'stale';
  return stored;
}

export async function createProject(name: string): Promise<{ project: Project; rawKey: string }> {
  const rawKey = generateRawProjectKey();

  const row = await prisma.project.create({
    data: { name, projectKey: hashProjectKey(rawKey) },
    include: { _count: { select: { tools: true } } },
  });

  return { project: toProject(row), rawKey };
}

export async function listProjects(): Promise<Project[]> {
  const rows = await prisma.project.findMany({
    include: { _count: { select: { tools: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toProject);
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  const row = await prisma.project.findUnique({
    where: { id },
    include: { _count: { select: { tools: true } } },
  });
  return row ? toProject(row) : undefined;
}

/** Most-recently-created project — MVP is single-project-per-workspace (§22 open question). */
export async function getLatestProject(): Promise<Project | undefined> {
  const row = await prisma.project.findFirst({
    include: { _count: { select: { tools: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return row ? toProject(row) : undefined;
}

/** Verifies a raw projectKey presented by the SDK on WS connect. Returns the project id, or undefined. */
export async function verifyProjectKey(rawKey: string): Promise<string | undefined> {
  const row = await prisma.project.findUnique({ where: { projectKey: hashProjectKey(rawKey) } });
  return row?.id;
}

export async function markConnected(
  projectId: string,
  meta: { framework?: string; nodeVersion?: string; sdkVersion?: string },
): Promise<void> {
  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: 'connected',
      lastSeenAt: new Date(),
      ...(meta.framework ? { framework: meta.framework } : {}),
      ...(meta.nodeVersion ? { nodeVersion: meta.nodeVersion } : {}),
      ...(meta.sdkVersion ? { sdkVersion: meta.sdkVersion } : {}),
    },
  });
}

export async function markHeartbeat(projectId: string): Promise<void> {
  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'connected', lastSeenAt: new Date() },
  });
}

export async function markDisconnected(projectId: string): Promise<void> {
  await prisma.project
    .update({ where: { id: projectId }, data: { status: 'disconnected' } })
    .catch(() => undefined); // project may have been deleted mid-connection
}

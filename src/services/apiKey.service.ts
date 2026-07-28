import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import type { ApiKey } from '../types/agent.types.js';

function generateRawKey(): string {
  return `ak_live_${randomBytes(24).toString('base64url')}`;
}

function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey + env.API_KEY_HASH_SECRET).digest('hex');
}

function previewFor(rawKey: string): string {
  const last4 = rawKey.slice(-4);
  return `ak_live_${'•'.repeat(8)}${last4}`;
}

interface ApiKeyRow {
  id: string;
  agentId: string;
  agent: { name: string };
  label: string;
  keyPreview: string;
  lastUsedAt: Date | null;
  createdAt: Date;
}

function toApiKey(row: ApiKeyRow): ApiKey {
  return {
    id: row.id,
    agentId: row.agentId,
    agentName: row.agent.name,
    label: row.label,
    keyPreview: row.keyPreview,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString(),
  };
}

export async function createApiKey(
  agentId: string,
  label: string,
): Promise<{ apiKey: ApiKey; rawKey: string }> {
  const rawKey = generateRawKey();

  const row = await prisma.apiKey.create({
    data: {
      agentId,
      label,
      hashedKey: hashKey(rawKey),
      keyPreview: previewFor(rawKey),
    },
    include: { agent: { select: { name: true } } },
  });

  return { apiKey: toApiKey(row), rawKey };
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const rows = await prisma.apiKey.findMany({
    include: { agent: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toApiKey);
}

export async function revokeApiKey(id: string): Promise<boolean> {
  try {
    await prisma.apiKey.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifies a raw key presented on a public API request, and stamps
 * lastUsedAt. Returns the agentId it's scoped to, or undefined if invalid.
 * Used by the public /api/v1 agent endpoint (added in a later step).
 */
export async function verifyApiKey(rawKey: string): Promise<string | undefined> {
  const row = await prisma.apiKey.findUnique({
    where: { hashedKey: hashKey(rawKey) },
  });
  if (!row) return undefined;

  await prisma.apiKey.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  });

  return row.agentId;
}

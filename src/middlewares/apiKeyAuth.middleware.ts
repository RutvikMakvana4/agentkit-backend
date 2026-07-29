import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { verifyApiKey } from '../services/apiKey.service.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by apiKeyAuth — the agent this request's API key is scoped to. */
      agentId?: string;
    }
  }
}

export async function apiKeyAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or malformed Authorization header. Expected: Bearer <api-key>');
  }

  const rawKey = header.slice('Bearer '.length).trim();
  if (!rawKey) {
    throw ApiError.unauthorized('Missing API key');
  }

  const agentId = await verifyApiKey(rawKey);
  if (!agentId) {
    throw ApiError.unauthorized('Invalid or revoked API key');
  }

  req.agentId = agentId;
  next();
}

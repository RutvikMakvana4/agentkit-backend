import { rateLimit } from 'express-rate-limit';

export const publicApiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30, // 30 requests/minute per API key (falls back to IP if no key resolved yet)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice('Bearer '.length).trim();
    }
    return req.ip ?? 'unknown';
  },
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests — please slow down.',
  },
});

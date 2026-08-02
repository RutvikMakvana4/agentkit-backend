import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(5000),
  CORS_ORIGIN: z.string().default('*'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  // LLM_API_KEY and LLM_BASE_URL let the OpenAI-compatible SDK talk to
  // providers such as OpenRouter. OPENAI_API_KEY remains supported for
  // existing OpenAI deployments.
  LLM_API_KEY: z.string().min(1).optional(),
  LLM_BASE_URL: z.url().optional(),
  LLM_MODEL_OVERRIDE: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  MAX_AGENT_ITERATIONS: z.coerce.number().default(10),
  // Pooled connection (Supabase Supavisor, port 6543) — used by the running
  // app for normal queries.
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // Direct connection (port 5432) — used only by Prisma CLI for migrations,
  // configured separately in prisma.config.ts.
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),
  // Extra secret mixed into API key hashes. Fine to leave default for local
  // dev, but set a real random value in production — see .env.example.
  API_KEY_HASH_SECRET: z.string().default('dev-only-insecure-secret'),
  // Per-tool-call timeout (PRD §31) — prevents a hanging backend call from
  // stalling the whole agent loop indefinitely.
  TOOL_EXECUTION_TIMEOUT_MS: z.coerce.number().default(10_000),
});

const parsed = envSchema
  .refine((value) => Boolean(value.LLM_API_KEY ?? value.OPENAI_API_KEY), {
    message: 'Set LLM_API_KEY (or OPENAI_API_KEY for the OpenAI provider)',
    path: ['LLM_API_KEY'],
  })
  .safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

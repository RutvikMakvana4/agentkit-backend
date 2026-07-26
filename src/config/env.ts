import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(5000),
  CORS_ORIGIN: z.string().default('*'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  MAX_AGENT_ITERATIONS: z.coerce.number().default(10),
  // Pooled connection (Supabase Supavisor, port 6543) — used by the running
  // app for normal queries.
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // Direct connection (port 5432) — used only by Prisma CLI for migrations,
  // configured separately in prisma.config.ts.
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

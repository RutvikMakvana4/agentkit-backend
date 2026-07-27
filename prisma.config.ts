import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Pooled (Supabase Supavisor, port 6543) — same connection the running
    // app uses via the adapter in src/config/prisma.ts.
    url: env('DATABASE_URL'),
    // Direct (port 5432) — `prisma migrate`/`db push` use this instead of
    // `url` automatically, since the pooled connection doesn't support the
    // session-level features migrations rely on.
    directUrl: env('DIRECT_URL'),
  },
});

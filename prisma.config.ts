import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Migrations need a direct (unpooled) connection — Supabase's pgbouncer
    // pooled connection doesn't support the session-level features
    // `prisma migrate` relies on. Runtime app queries use DATABASE_URL
    // (pooled) instead, configured separately in src/config/prisma.ts.
    url: env('DIRECT_URL'),
  },
});

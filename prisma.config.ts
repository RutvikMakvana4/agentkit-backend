import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // The Prisma CLI uses DATABASE_URL. Production migration commands override
    // this with DIRECT_URL; see the db:deploy script in package.json.
    url: env('DATABASE_URL'),
  },
});

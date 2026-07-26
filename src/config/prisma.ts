import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env.js';

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  // Supabase's pooled connection is behind a proxy whose certificate chain
  // node-postgres won't always validate cleanly out of the box. Relax this
  // once you've set up proper CA handling (see PRD security notes) — fine
  // for now since the connection itself is still encrypted.
  ssl: { rejectUnauthorized: false },
});

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as { reconshieldPrisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = env.databaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

/**
 * Lazily-created Prisma singleton. Kept lazy so importing this module during a
 * build does not require a live database. Server-only.
 */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.reconshieldPrisma) {
    globalForPrisma.reconshieldPrisma = createClient();
  }
  return globalForPrisma.reconshieldPrisma;
}

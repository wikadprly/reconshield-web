import "server-only";

import { getPrisma } from "@/db/prisma";
import type { AuditEntry } from "@/types/security";

export async function findRecentAuditEntries(limit = 20): Promise<AuditEntry[]> {
  const rows = await getPrisma().auditEntry.findMany({
    orderBy: { timestamp: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    administrator: row.administrator,
    previousMode: row.previousMode as AuditEntry["previousMode"],
    newMode: row.newMode as AuditEntry["newMode"],
  }));
}

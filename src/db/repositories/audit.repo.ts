import "server-only";

import { getPrisma } from "@/db/prisma";
import { assertOneOf } from "@/lib/validation";
import type { AuditEntry, MitigationMode } from "@/types/security";

const MODES = ["Automatic", "Manual"] as const;

export async function findRecentAuditEntries(limit = 20): Promise<AuditEntry[]> {
  const rows = await getPrisma().auditEntry.findMany({
    orderBy: { timestamp: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    administrator: row.administrator,
    previousMode: assertOneOf<MitigationMode>(row.previousMode, MODES, "auditEntry.previousMode"),
    newMode: assertOneOf<MitigationMode>(row.newMode, MODES, "auditEntry.newMode"),
  }));
}

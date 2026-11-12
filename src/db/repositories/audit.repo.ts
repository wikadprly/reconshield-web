import "server-only";

import { getPrisma } from "@/db/prisma";
import { assertOneOf } from "@/lib/validation";
import type { AuditAction, AuditEntry } from "@/types/security";

const ACTIONS = ["policy_change", "approval_approved", "approval_rejected", "tarpit_release", "tarpit_verify", "tarpit_apply"] as const;

export async function findRecentAuditEntries(limit = 20): Promise<AuditEntry[]> {
  const rows = await getPrisma().auditEntry.findMany({
    orderBy: { timestamp: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    administrator: row.administrator,
    previousMode: row.previousMode,
    newMode: row.newMode,
    action: assertOneOf<AuditAction>(row.action, ACTIONS, "auditEntry.action"),
    target: row.target ?? undefined,
    reason: row.reason ?? undefined,
  }));
}

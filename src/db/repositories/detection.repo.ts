import "server-only";

import { getPrisma } from "@/db/prisma";
import { assertOneOf } from "@/lib/validation";
import type { Detection } from "@/types/security";

const CLASSIFICATIONS = ["Reconnaissance", "Normal"] as const;
const ACTIONS = ["TARPIT", "Pending", "Blocked"] as const;
const STATUSES = ["Active", "Review", "Released", "Resolved"] as const;

/** Global totals for the dashboard, independent of the loaded sample. */
export async function countDetections(): Promise<{ total: number; reconnaissance: number }> {
  const prisma = getPrisma();
  const [total, reconnaissance] = await Promise.all([
    prisma.detection.count(),
    prisma.detection.count({ where: { classification: "Reconnaissance" } }),
  ]);
  return { total, reconnaissance };
}

export async function findRecentDetections(limit = 20): Promise<Detection[]> {
  const rows = await getPrisma().detection.findMany({
    orderBy: { timestamp: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    sourceIp: row.sourceIp,
    sourcePort: row.sourcePort,
    destinationIp: row.destinationIp,
    destinationPort: row.destinationPort,
    classification: assertOneOf(row.classification, CLASSIFICATIONS, "detection.classification"),
    confidence: row.confidence,
    action: assertOneOf(row.action, ACTIONS, "detection.action"),
    status: assertOneOf(row.status, STATUSES, "detection.status"),
  }));
}

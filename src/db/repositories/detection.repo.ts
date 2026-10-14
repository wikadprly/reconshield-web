import "server-only";

import { getPrisma } from "@/db/prisma";
import type { Detection } from "@/types/security";

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
    classification: row.classification as Detection["classification"],
    confidence: row.confidence,
    action: row.action as Detection["action"],
    status: row.status as Detection["status"],
  }));
}

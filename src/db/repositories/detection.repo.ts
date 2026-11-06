import "server-only";

import { Pool } from "pg";
import { assertOneOf } from "@/lib/validation";
import type { Detection } from "@/types/security";
import { env } from "@/lib/env";

const CLASSIFICATIONS = ["Reconnaissance", "Normal"] as const;
const ACTIONS = ["TARPIT", "Pending", "Blocked"] as const;
const STATUSES = ["Active", "Review", "Released", "Resolved"] as const;

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    const conn = env.databaseUrl();
    if (!conn) throw new Error("DATABASE_URL is not configured");
    pool = new Pool({ connectionString: conn });
  }
  return pool;
}

export async function findRecentDetections(limit = 20): Promise<Detection[]> {
  try {
    const { rows } = await getPool().query(
      `SELECT id, timestamp, "sourceIp", "sourcePort", "destinationIp", "destinationPort", classification, confidence, action, status
       FROM detections
       ORDER BY timestamp DESC
       LIMIT $1`,
      [limit]
    );

    return rows.map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : new Date(row.timestamp).toISOString(),
      sourceIp: row.sourceIp,
      sourcePort: row.sourcePort,
      destinationIp: row.destinationIp,
      destinationPort: row.destinationPort,
      classification: assertOneOf(row.classification, CLASSIFICATIONS, "detection.classification"),
      confidence: Number(row.confidence),
      action: assertOneOf(row.action, ACTIONS, "detection.action"),
      status: assertOneOf(row.status, STATUSES, "detection.status"),
    }));
  } catch (error) {
    console.error("[detection.repo] pg query failed, falling back to prisma:", error);
    // fallback to prisma if pg fails
    const { getPrisma } = await import("@/db/prisma");
    const rows = await getPrisma().detection.findMany({
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return rows.map((row: any) => ({
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
}

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

export interface TrafficPoint {
  time: string;
  normal: number;
  reconnaissance: number;
}

const BUCKET_HOURS: Record<string, number> = { "1h": 1, "24h": 24, "7d": 24 * 7 };

/**
 * Bucket detections into the dashboard trend chart. Buckets are relative to the
 * newest record (not wall-clock "now") so a seeded lab dataset still renders a
 * meaningful shape instead of an empty chart.
 */
export async function findTrafficSeries(range: string, buckets = 7): Promise<TrafficPoint[]> {
  const hours = BUCKET_HOURS[range] ?? 24;
  const newest = await getPrisma().detection.findFirst({ orderBy: { timestamp: "desc" }, select: { timestamp: true } });
  const reference = newest?.timestamp?.getTime() ?? Date.now();
  const windowMs = hours * 3_600_000;
  const since = new Date(reference - windowMs);

  const rows = await getPrisma().detection.findMany({
    where: { timestamp: { gte: since } },
    select: { timestamp: true, classification: true },
  });

  const step = windowMs / buckets;
  const series: TrafficPoint[] = Array.from({ length: buckets }, (_, index) => {
    const at = new Date(reference - (buckets - 1 - index) * step);
    const label = range === "7d"
      ? at.toLocaleDateString("id-ID", { weekday: "short" })
      : at.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
    return { time: label, normal: 0, reconnaissance: 0 };
  });

  for (const row of rows) {
    const elapsed = row.timestamp.getTime() - since.getTime();
    const offset = Math.floor(elapsed / step);
    const index = Math.min(buckets - 1, Math.max(0, offset));
    if (row.classification === "Reconnaissance") series[index]!.reconnaissance += 1;
    else series[index]!.normal += 1;
  }

  return series;
}

export interface ActivityCounts {
  recent: number;
  previous: number;
  reconnaissanceRecent: number;
  lastSeenAt?: string;
  lastSourceIp?: string;
  lastDestinationPort?: number;
  referenceAt: string;
}

/**
 * Rolling window counts used by the "current status" panel. Both windows are
 * anchored to the newest record (not wall clock) so a seeded dataset is not
 * reported as permanently idle.
 */
export async function findActivity(windowMinutes = 60): Promise<ActivityCounts> {
  const prisma = getPrisma();
  const newest = await prisma.detection.findFirst({ orderBy: { timestamp: "desc" } });
  if (!newest) {
    return { recent: 0, previous: 0, reconnaissanceRecent: 0, referenceAt: new Date().toISOString() };
  }

  const reference = newest.timestamp.getTime();
  const windowMs = windowMinutes * 60_000;
  const recentSince = new Date(reference - windowMs);
  const previousSince = new Date(reference - windowMs * 2);

  const [recent, reconnaissanceRecent, previous] = await Promise.all([
    prisma.detection.count({ where: { timestamp: { gte: recentSince } } }),
    prisma.detection.count({ where: { timestamp: { gte: recentSince }, classification: "Reconnaissance" } }),
    prisma.detection.count({ where: { timestamp: { gte: previousSince, lt: recentSince } } }),
  ]);

  return {
    recent,
    previous,
    reconnaissanceRecent,
    lastSeenAt: newest.timestamp.toISOString(),
    lastSourceIp: newest.sourceIp,
    lastDestinationPort: newest.destinationPort,
    referenceAt: new Date(reference).toISOString(),
  };
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

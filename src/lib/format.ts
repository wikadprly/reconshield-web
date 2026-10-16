/**
 * Client-safe display helpers. Never import server-only modules from here.
 */

/**
 * Render a timestamp for display. ISO strings from the database are formatted
 * as "10 Mar 2026, 21:48"; values that are already human-formatted (mock data)
 * pass through untouched. Unparseable strings are returned as-is.
 */
export function formatTimestamp(value: string): string {
  if (!value.includes("T")) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Parse a timestamp that may be ISO (database) or already formatted (mock).
 * Returns null when the value cannot be interpreted as a date.
 */
export function parseTimestamp(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** A source IP ranked by how many detections it produced. */
export interface RankedSource {
  ip: string;
  count: number;
}

/** Group detections by source IP and rank by detection count (desc). */
export function rankTopSources<T extends { sourceIp: string }>(rows: T[], limit = 5): RankedSource[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.sourceIp, (counts.get(row.sourceIp) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count || a.ip.localeCompare(b.ip))
    .slice(0, limit);
}

/**
 * Render a metric as a percentage. Model metrics may be expressed either as a
 * fraction (0.9784) or as a percentage (97.84); values at or below 1 are treated
 * as fractions and scaled up so the label is always consistent.
 */
export function formatPercent(value: number): string {
  const percent = value <= 1 ? value * 100 : value;
  return `${percent.toFixed(2)}%`;
}

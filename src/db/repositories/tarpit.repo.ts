import "server-only";

import { getPrisma } from "@/db/prisma";
import type { TarpitEntry } from "@/types/security";

export async function findActiveTarpitEntries(): Promise<TarpitEntry[]> {
  const rows = await getPrisma().tarpitEntry.findMany({
    where: { status: "Active" },
    orderBy: { detectedAt: "desc" },
  });

  return rows.map((row) => ({
    ip: row.ip,
    detectedAt: row.detectedAt.toISOString(),
    duration: row.duration,
    addressList: row.addressList,
    status: "Active",
  }));
}

export async function findTarpitEntryByIp(ip: string): Promise<TarpitEntry | null> {
  const row = await getPrisma().tarpitEntry.findUnique({ where: { ip } });
  if (!row) return null;
  return {
    ip: row.ip,
    detectedAt: row.detectedAt.toISOString(),
    duration: row.duration,
    addressList: row.addressList,
    status: "Active",
  };
}

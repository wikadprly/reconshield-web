import "server-only";

import { getPrisma } from "@/db/prisma";
import type { RouterHistoryPoint, RouterResource } from "@/types/security";

function formatTime(date: Date): string {
  // Server-local clock is fine for the chart's x axis.
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export async function insertRouterSample(resource: RouterResource): Promise<void> {
  const prisma = getPrisma();
  await prisma.routerSample.create({
    data: {
      boardName: resource.boardName,
      routerOsVersion: resource.routerOsVersion,
      cpuLoadPercent: resource.cpuLoadPercent,
      usedMemPercent: resource.memoryUsedPercent,
      freeMemMb: resource.freeMemoryMegabytes,
      totalMemMb: resource.totalMemoryMegabytes,
      uptime: resource.uptime,
    },
  });
  // Housekeeping: keep the table small; six hours of samples is plenty for
  // the dashboard chart.
  await prisma.routerSample.deleteMany({
    where: { takenAt: { lt: new Date(Date.now() - 6 * 60 * 60 * 1000) } },
  });
}

export async function findRecentRouterSamples(limit = 60): Promise<RouterHistoryPoint[]> {
  const rows = await getPrisma().routerSample.findMany({
    orderBy: { takenAt: "desc" },
    take: limit,
  });

  // Chronological order for the chart (oldest -> newest).
  return rows
    .reverse()
    .map((row) => ({
      time: formatTime(row.takenAt),
      cpuLoadPercent: row.cpuLoadPercent,
      memoryUsedPercent: row.usedMemPercent,
    }));
}

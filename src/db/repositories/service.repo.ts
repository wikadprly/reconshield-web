import "server-only";

import { getPrisma } from "@/db/prisma";
import { assertOneOf } from "@/lib/validation";
import type { ServiceStatus } from "@/types/security";

const STATUSES = ["Online", "Offline"] as const;

export async function findServiceStatuses(): Promise<ServiceStatus[]> {
  const rows = await getPrisma().serviceStatus.findMany({
    orderBy: { name: "asc" },
  });

  return rows.map((row) => ({
    name: row.name,
    detail: row.detail,
    status: assertOneOf(row.status, STATUSES, "serviceStatus.status"),
  }));
}

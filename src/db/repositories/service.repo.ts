import "server-only";

import { getPrisma } from "@/db/prisma";
import type { ServiceStatus } from "@/types/security";

export async function findServiceStatuses(): Promise<ServiceStatus[]> {
  const rows = await getPrisma().serviceStatus.findMany({
    orderBy: { name: "asc" },
  });

  return rows.map((row) => ({
    name: row.name,
    detail: row.detail,
    status: row.status as ServiceStatus["status"],
  }));
}

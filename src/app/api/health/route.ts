import { env } from "@/lib/env";
import { isMikrotikConfigured } from "@/services/mikrotik-service";
import { isMlConfigured } from "@/services/ml-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Read-only readiness probe. Reports which integrations are configured without
 * ever returning credentials or connection strings.
 */
export async function GET() {
  return Response.json({
    status: "ok",
    services: {
      database: { configured: Boolean(env.databaseUrl()) },
      mlApi: { configured: isMlConfigured() },
      routerOs: { configured: isMikrotikConfigured() },
    },
    mockDataEnabled: env.useMockData(),
    checkedAt: new Date().toISOString(),
  });
}

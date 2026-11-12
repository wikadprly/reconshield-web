import { getPrisma } from "@/db/prisma";
import { env } from "@/lib/env";
import { requestJson } from "@/lib/http";
import { getSystemResourceBinary } from "@/services/mikrotik-binary-service";
import { isMikrotikConfigured } from "@/services/mikrotik-service";
import { isMlConfigured } from "@/services/ml-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Probe = { configured: boolean; reachable: boolean; latencyMs?: number; detail?: string };

async function timed(probe: () => Promise<void>): Promise<{ ok: boolean; latencyMs: number; detail?: string }> {
  const started = Date.now();
  try {
    await probe();
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - started, detail: error instanceof Error ? error.message : "unknown error" };
  }
}

/**
 * Readiness probe. Reports configuration AND reachability, with latency, so a
 * "sehat" badge cannot hide a service that is down. Never returns credentials
 * or connection strings.
 */
export async function GET() {
  const checks: Record<string, Probe> = {};

  if (env.databaseUrl()) {
    const result = await timed(async () => {
      await getPrisma().$queryRaw`SELECT 1`;
    });
    checks.database = { configured: true, reachable: result.ok, latencyMs: result.latencyMs, detail: result.detail };
  } else {
    checks.database = { configured: false, reachable: false };
  }

  if (isMlConfigured()) {
    const baseUrl = env.pythonMlApiUrl()!.replace(/\/$/, "");
    const result = await timed(async () => {
      await requestJson(`${baseUrl}/model/metrics`, { timeoutMs: 3000 });
    });
    checks.mlApi = { configured: true, reachable: result.ok, latencyMs: result.latencyMs, detail: result.detail };
  } else {
    checks.mlApi = { configured: false, reachable: false };
  }

  // RouterOS is probed read-only via /system/resource when configured.
  if (isMikrotikConfigured()) {
    const result = await timed(async () => {
      const resource = await getSystemResourceBinary();
      if (!resource) throw new Error("RouterOS tidak mengembalikan /system/resource");
    });
    checks.routerOs = { configured: true, reachable: result.ok, latencyMs: result.latencyMs, detail: result.detail };
  } else {
    checks.routerOs = { configured: false, reachable: false };
  }

  const critical = [checks.database, checks.mlApi].filter((check) => check.configured);
  const healthy = critical.every((check) => check.reachable);

  return Response.json({
    status: healthy ? "ok" : critical.some((check) => check.reachable) ? "degraded" : "down",
    services: checks,
    mockDataEnabled: env.useMockData(),
    checkedAt: new Date().toISOString(),
  });
}

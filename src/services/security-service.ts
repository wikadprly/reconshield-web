import "server-only";

import { findRecentAuditEntries } from "@/db/repositories/audit.repo";
import { findRecentDetections } from "@/db/repositories/detection.repo";
import { findRecentRouterSamples, insertRouterSample } from "@/db/repositories/router.repo";
import { findLatestModelMetrics } from "@/db/repositories/ml.repo";
import { findServiceStatuses } from "@/db/repositories/service.repo";
import { findActiveTarpitEntries } from "@/db/repositories/tarpit.repo";
import {
  auditEntries as mockAudit,
  detections as mockDetections,
  modelMetrics as mockMetrics,
  routerResource as mockRouterResource,
  services as mockServices,
  tarpitEntries as mockTarpit,
} from "@/data/mock-security";
import { env } from "@/lib/env";
import { getSystemResourceBinary, isMikrotikBinaryConfigured, listTarpitAddressListBinary } from "@/services/mikrotik-binary-service";
import { isMikrotikConfigured, listTarpitAddressList } from "@/services/mikrotik-service";
import { fetchModelMetrics, isMlConfigured } from "@/services/ml-service";
import type { ApiResult, AuditEntry, DataSource, Detection, MitigationMode, ModelMetrics, RouterHistoryPoint, RouterResource, SecurityOverview, ServiceStatus, TarpitEntry } from "@/types/security";

function now(): string {
  return new Date().toISOString();
}

/** Clearly-labeled fake history so the chart stays useful in mock mode. */
function mockRouterHistory(limit: number): RouterHistoryPoint[] {
  const points: RouterHistoryPoint[] = [];
  const nowMs = Date.now();
  const stepMs = 60_000;
  const pad = (value: number) => String(value).padStart(2, "0");
  for (let i = limit - 1; i >= 0; i -= 1) {
    const taken = new Date(nowMs - i * stepMs);
    const wave = Math.sin((limit - i) / 3.5);
    points.push({
      time: `${pad(taken.getHours())}:${pad(taken.getMinutes())}`,
      cpuLoadPercent: Math.max(2, Math.round((mockRouterResource.cpuLoadPercent + wave * 12 + (i % 5) * 1.5) * 10) / 10),
      memoryUsedPercent: Math.max(10, Math.round((mockRouterResource.memoryUsedPercent + wave * 4) * 10) / 10),
    });
  }
  return points;
}

function mockDisabledError(context: string): Error {
  return new Error(`${context} is unavailable and mock data is disabled (RECONSHIELD_USE_MOCK_DATA=false).`);
}

/**
 * Single, predictable fallback order used by every DB-backed dataset:
 *
 *   1. `RECONSHIELD_USE_MOCK_DATA` enabled (anything other than "false") →
 *      return labeled mock data immediately. The database is never touched in
 *      this mode, so Prisma instability cannot take the API down.
 *   2. Otherwise, read the database when `DATABASE_URL` is configured.
 *   3. Otherwise fail loudly — with mock mode disabled there is no honest
 *      data source left, so the route returns a 503 instead of pretending.
 */
async function fromDatabaseOrMock<T>(load: () => Promise<T>, mock: () => T, context: string): Promise<ApiResult<T>> {
  const generatedAt = now();

  if (env.useMockData()) {
    return { data: mock(), source: "mock", generatedAt };
  }

  if (!env.databaseUrl()) {
    throw mockDisabledError(context);
  }

  try {
    return { data: await load(), source: "database", generatedAt };
  } catch (error) {
    console.error("[security-service] database read failed:", error);
    // Mock mode is off, so there is nothing honest to fall back on.
    throw mockDisabledError(context);
  }
}

export function getRecentDetections(limit = 20): Promise<ApiResult<Detection[]>> {
  return fromDatabaseOrMock(
    () => findRecentDetections(limit),
    () => mockDetections.slice(0, limit),
    "Detection log",
  );
}

/**
 * Tarpit entries prefer the live MikroTik address list (`recon`) via the binary
 * API, then the legacy REST API, then the standard database/mock order. If the
 * router read fails, mock mode still gets labeled mock data instead of an error.
 */
export async function getTarpitEntries(): Promise<ApiResult<TarpitEntry[]>> {
  const generatedAt = now();

  if (isMikrotikBinaryConfigured()) {
    try {
      const ips = await listTarpitAddressListBinary("recon");
      const entries: TarpitEntry[] = ips.map((ip) => ({
        ip,
        detectedAt: generatedAt,
        duration: "Live (MikroTik)",
        addressList: "recon",
        status: "Active",
      }));
      return { data: entries, source: "remote", generatedAt };
    } catch (error) {
      console.error("[security-service] mikrotik binary tarpit read failed:", error);
    }
  }

  if (isMikrotikConfigured()) {
    try {
      const ips = await listTarpitAddressList("recon");
      const entries: TarpitEntry[] = ips.map((ip) => ({
        ip,
        detectedAt: generatedAt,
        duration: "Live (MikroTik)",
        addressList: "recon",
        status: "Active",
      }));
      return { data: entries, source: "remote", generatedAt };
    } catch (error) {
      console.error("[security-service] mikrotik tarpit read failed:", error);
    }
  }

  return fromDatabaseOrMock(
    () => findActiveTarpitEntries(),
    () => mockTarpit,
    "Active tarpit list",
  );
}

/**
 * Live `/system/resource` telemetry from the router over the binary API.
 * Falls back to labeled mock data only when mock mode is enabled; otherwise it
 * fails loudly so the UI cannot present pretend telemetry as live.
 */
export async function getRouterResource(): Promise<ApiResult<RouterResource>> {
  const generatedAt = now();

  if (isMikrotikBinaryConfigured()) {
    const raw = await getSystemResourceBinary();
    if (raw) {
      const total = Number(raw["total-memory"] ?? 0);
      const free = Number(raw["free-memory"] ?? 0);
      const used = total > free ? total - free : 0;
      const resource: RouterResource = {
        boardName: raw["board-name"] ?? "MikroTik router",
        routerOsVersion: raw.version ?? "unknown",
        cpuLoadPercent: Number(raw["cpu-load"] ?? 0),
        freeMemoryMegabytes: Math.round((free / 1_048_576) * 10) / 10,
        totalMemoryMegabytes: Math.round((total / 1_048_576) * 10) / 10,
        memoryUsedPercent: total > 0 ? Math.round((used / total) * 1_000) / 10 : 0,
        uptime: raw.uptime ?? "unknown",
      };
      // Persistence must never break the live read; a full table or a Prisma
      // hiccup only costs one history point.
      try {
        await insertRouterSample(resource);
      } catch (error) {
        console.error("[security-service] router sample insert failed:", error);
      }
      return { data: resource, source: "remote", generatedAt };
    }
  }

  if (env.useMockData()) {
    return { data: mockRouterResource, source: "mock", generatedAt };
  }

  throw mockDisabledError("Router resource telemetry");
}

/**
 * Historical router health samples for the dashboard chart. Database-backed
 * when samples exist; mock mode gets clearly-labeled fake data; otherwise an
 * honest empty series while samples accumulate.
 */
export async function getRouterResourceHistory(limit = 120): Promise<ApiResult<RouterHistoryPoint[]>> {
  const generatedAt = now();

  if (env.useMockData()) {
    return { data: mockRouterHistory(limit), source: "mock", generatedAt };
  }

  if (env.databaseUrl()) {
    try {
      const data = await findRecentRouterSamples(limit);
      if (data.length > 0) return { data, source: "database", generatedAt };
    } catch (error) {
      console.error("[security-service] router history read failed:", error);
    }
    return { data: [], source: "database", generatedAt };
  }

  throw mockDisabledError("Router resource history");
}

export async function getServiceStatuses(): Promise<ApiResult<ServiceStatus[]>> {
  const generatedAt = now();
  const base = await fromDatabaseOrMock(() => findServiceStatuses(), () => mockServices, "Service status");
  const services = [...base.data];
  const mikrotikIdx = services.findIndex((service) => {
    const name = service.name.toLowerCase();
    return name.includes("mikrotik") || name.includes("routeros");
  });

  // Probe the binary API for real so the status reflects the router, not hope.
  if (isMikrotikBinaryConfigured()) {
    const resource = await getSystemResourceBinary();
    const mikrotikStatus: ServiceStatus = {
      name: mikrotikIdx >= 0 ? services[mikrotikIdx].name : "MikroTik RouterOS API",
      detail: resource
        ? `Binary API reachable · CPU ${resource["cpu-load"] ?? "?"}% · up ${resource.uptime ?? "?"}`
        : "Binary API unreachable",
      status: resource ? "Online" : "Offline",
    };
    if (mikrotikIdx >= 0) {
      services[mikrotikIdx] = mikrotikStatus;
    } else {
      services.push(mikrotikStatus);
    }
    // Only claim "remote" when the probe actually returned live telemetry.
    return { data: services, source: resource ? "remote" : base.source, generatedAt };
  }

  if (isMikrotikConfigured()) {
    const mikrotikStatus: ServiceStatus = {
      name: mikrotikIdx >= 0 ? services[mikrotikIdx].name : "MikroTik RouterOS API",
      detail: "REST API endpoint configured (RouterOS 6.x may not serve /rest)",
      status: "Online",
    };
    if (mikrotikIdx >= 0) {
      services[mikrotikIdx] = mikrotikStatus;
    } else {
      services.push(mikrotikStatus);
    }
  } else if (mikrotikIdx >= 0) {
    services[mikrotikIdx] = {
      ...services[mikrotikIdx],
      detail: services[mikrotikIdx].detail || "Not configured",
      status: "Offline",
    };
  }

  return { ...base, data: services };
}

export function getAuditEntries(limit = 20): Promise<ApiResult<AuditEntry[]>> {
  return fromDatabaseOrMock(
    () => findRecentAuditEntries(limit),
    () => mockAudit.slice(0, limit),
    "Audit log",
  );
}

/**
 * Model metrics fallback order (database → remote ML API → mock when enabled).
 * When mock mode is on the database and remote API are skipped entirely.
 */
export async function getMlMetrics(): Promise<ApiResult<ModelMetrics>> {
  const generatedAt = now();

  if (env.useMockData()) {
    return { data: mockMetrics, source: "mock", generatedAt };
  }

  if (env.databaseUrl()) {
    try {
      const data = await findLatestModelMetrics();
      if (data) return { data, source: "database", generatedAt };
    } catch (error) {
      console.error("[security-service] model metrics read failed:", error);
    }
  }

  if (isMlConfigured()) {
    try {
      const data = await fetchModelMetrics();
      if (data) return { data, source: "remote", generatedAt };
    } catch (error) {
      console.error("[security-service] ML API read failed:", error);
    }
  }

  throw mockDisabledError("Model metrics");
}

export async function getSecurityOverview(): Promise<ApiResult<SecurityOverview>> {
  const [detections, tarpit, services] = await Promise.all([
    getRecentDetections(100),
    getTarpitEntries(),
    getServiceStatuses(),
  ]);

  // Label the overview honestly: anything containing mock content stays labeled
  // "mock"; otherwise the common source wins.
  const sources = new Set<DataSource>([detections.source, tarpit.source, services.source]);
  const source: DataSource = sources.has("mock") ? "mock" : sources.size === 1 ? detections.source : "remote";

  return {
    data: {
      detections: detections.data,
      tarpit: tarpit.data,
      services: services.data,
      sampleCounts: {
        detections: detections.data.length,
        reconnaissance: detections.data.filter((row) => row.classification === "Reconnaissance").length,
        tarpitActive: tarpit.data.filter((row) => row.status === "Active").length,
      },
    },
    source,
    generatedAt: detections.generatedAt,
  };
}

// Write operations remain disabled in the read-only phase. When they are
// enabled they must validate input, authorize an administrator, apply the
// change through the backend, and record an audit entry in one transaction.
export async function requestMitigationMode(_mode: MitigationMode): Promise<never> {
  throw new Error("Changing the mitigation mode is disabled in the read-only phase.");
}

export async function requestIpRelease(_ip: string): Promise<never> {
  throw new Error("Releasing an IP is disabled in the read-only phase.");
}

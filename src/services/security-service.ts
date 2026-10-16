import "server-only";

import { findRecentAuditEntries } from "@/db/repositories/audit.repo";
import { findRecentDetections } from "@/db/repositories/detection.repo";
import { findLatestModelMetrics } from "@/db/repositories/ml.repo";
import { findServiceStatuses } from "@/db/repositories/service.repo";
import { findActiveTarpitEntries } from "@/db/repositories/tarpit.repo";
import { auditEntries as mockAudit, detections as mockDetections, modelMetrics as mockMetrics, services as mockServices, tarpitEntries as mockTarpit } from "@/data/mock-security";
import { env } from "@/lib/env";
import { fetchModelMetrics, isMlConfigured } from "@/services/ml-service";
import type { ApiResult, AuditEntry, DataSource, Detection, MitigationMode, ModelMetrics, SecurityOverview, ServiceStatus, TarpitEntry } from "@/types/security";

function now(): string {
  return new Date().toISOString();
}

/**
 * Read a dataset from the database when configured, otherwise fall back to
 * clearly-labeled mock data (or fail loudly when mock data is disabled). Every
 * result carries its `source` so the UI can label it honestly.
 */
async function fromDatabaseOrMock<T>(load: () => Promise<T>, mock: () => T): Promise<ApiResult<T>> {
  const generatedAt = now();

  if (env.databaseUrl()) {
    try {
      return { data: await load(), source: "database", generatedAt };
    } catch (error) {
      console.error("[security-service] database read failed:", error);
    }
  }

  if (!env.useMockData()) {
    throw new Error("No data source is available and mock data is disabled (RECONSHIELD_USE_MOCK_DATA=false).");
  }

  return { data: mock(), source: "mock", generatedAt };
}

export function getRecentDetections(limit = 20): Promise<ApiResult<Detection[]>> {
  return fromDatabaseOrMock(() => findRecentDetections(limit), () => mockDetections.slice(0, limit));
}

export function getTarpitEntries(): Promise<ApiResult<TarpitEntry[]>> {
  return fromDatabaseOrMock(() => findActiveTarpitEntries(), () => mockTarpit);
}

export function getServiceStatuses(): Promise<ApiResult<ServiceStatus[]>> {
  return fromDatabaseOrMock(() => findServiceStatuses(), () => mockServices);
}

export function getAuditEntries(limit = 20): Promise<ApiResult<AuditEntry[]>> {
  return fromDatabaseOrMock(() => findRecentAuditEntries(limit), () => mockAudit.slice(0, limit));
}

export async function getMlMetrics(): Promise<ApiResult<ModelMetrics>> {
  const generatedAt = now();

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

  if (!env.useMockData()) {
    throw new Error("No model metrics are available and mock data is disabled (RECONSHIELD_USE_MOCK_DATA=false).");
  }

  return { data: mockMetrics, source: "mock", generatedAt };
}

export async function getSecurityOverview(): Promise<ApiResult<SecurityOverview>> {
  const [detections, tarpit, services] = await Promise.all([
    getRecentDetections(100),
    getTarpitEntries(),
    getServiceStatuses(),
  ]);

  const source: DataSource =
    detections.source === "database" && tarpit.source === "database" && services.source === "database"
      ? "database"
      : "mock";

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

import "server-only";

import { findRecentAuditEntries } from "@/db/repositories/audit.repo";
import { findRecentDetections } from "@/db/repositories/detection.repo";
import { findLatestModelMetrics } from "@/db/repositories/ml.repo";
import { findMitigationPolicy, saveMitigationPolicy } from "@/db/repositories/policy.repo";
import { findServiceStatuses } from "@/db/repositories/service.repo";
import { findActiveTarpitEntries } from "@/db/repositories/tarpit.repo";
import { auditEntries as mockAudit, detections as mockDetections, mitigationPolicy as mockPolicy, modelMetrics as mockMetrics, services as mockServices, tarpitEntries as mockTarpit } from "@/data/mock-security";
import { env } from "@/lib/env";
import { parsePolicyPayload } from "@/lib/policy";
import { fetchModelMetrics, isMlConfigured } from "@/services/ml-service";
import type { ApiResult, AuditEntry, DataSource, Detection, MitigationMode, MitigationPolicy, ModelMetrics, SecurityOverview, ServiceStatus, TarpitEntry } from "@/types/security";

/** Local-network stand-in until authentication exists (audit actor). */
export const LOCAL_ACTOR = "admin lokal";

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
    throw new Error("Sumber data tidak tersedia dan data mock dinonaktifkan (RECONSHIELD_USE_MOCK_DATA=false).");
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
    throw new Error("Metrik model tidak tersedia dan data mock dinonaktifkan (RECONSHIELD_USE_MOCK_DATA=false).");
  }

  return { data: mockMetrics, source: "mock", generatedAt };
}

export async function getSecurityOverview(): Promise<ApiResult<SecurityOverview>> {
  const [detections, tarpit, services] = await Promise.all([
    getRecentDetections(100),
    getTarpitEntries(),
    getServiceStatuses(),
  ]);

  // One label only when every part of the overview came from the same place.
  // The old check labelled a mostly-live screen as "mock" whenever a single
  // panel fell back (T8).
  const sources: DataSource[] = [detections.source, tarpit.source, services.source];
  const first = sources[0];
  const source: DataSource =
    first !== undefined && sources.every((item) => item === first) ? first : "mixed";

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

export function getMitigationPolicy(): Promise<ApiResult<MitigationPolicy>> {
  return fromDatabaseOrMock(() => findMitigationPolicy(), () => mockPolicy);
}

/**
 * Persist a policy change. This is the one write path enabled in the
 * read-only phase: it changes configuration only, never the router, and the
 * change + audit entry are committed together.
 */
export async function updateMitigationPolicy(
  payload: unknown,
  actor: { administrator: string; administratorId?: string; reason?: string } = { administrator: LOCAL_ACTOR },
): Promise<MitigationPolicy> {
  if (!env.databaseUrl()) {
    throw new Error("DATABASE_URL tidak dikonfigurasi; kebijakan tidak bisa disimpan.");
  }
  const policy = parsePolicyPayload(payload);
  const rawReason = (payload as { reason?: unknown }).reason;
  const reason = typeof rawReason === "string" && rawReason.trim() !== "" ? rawReason.trim().slice(0, 200) : undefined;
  return saveMitigationPolicy(policy, { ...actor, reason });
}

// Router write operations remain disabled in the read-only phase. When they
// are enabled they must validate input, authorize an administrator, apply the
// change through the backend, and record an audit entry in one transaction.
export async function requestMitigationMode(_mode: MitigationMode): Promise<never> {
  throw new Error("Mengubah mode mitigasi dinonaktifkan pada fase baca-saja.");
}

export async function requestIpRelease(_ip: string): Promise<never> {
  throw new Error("Melepas IP dinonaktifkan pada fase baca-saja.");
}

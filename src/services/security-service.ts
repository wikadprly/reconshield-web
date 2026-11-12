import "server-only";

import { createApproval, decideApproval, findApprovals } from "@/db/repositories/approval.repo";
import { findRecentAuditEntries } from "@/db/repositories/audit.repo";
import { findEvidenceByDetection, saveEvidence, type EvidenceInput } from "@/db/repositories/evidence.repo";
import { countDetections, findRecentDetections, findTrafficSeries, type TrafficPoint } from "@/db/repositories/detection.repo";
import { findLatestModelMetrics } from "@/db/repositories/ml.repo";
import { findMitigationPolicy, saveMitigationPolicy } from "@/db/repositories/policy.repo";
import { findServiceStatuses } from "@/db/repositories/service.repo";
import { countActiveTarpitEntries, findActiveTarpitEntries, markTarpitReleased, markTarpitVerified } from "@/db/repositories/tarpit.repo";
import { auditEntries as mockAudit, detections as mockDetections, mitigationPolicy as mockPolicy, modelMetrics as mockMetrics, services as mockServices, tarpitEntries as mockTarpit } from "@/data/mock-security";
import { env } from "@/lib/env";
import { parsePolicyPayload } from "@/lib/policy";
import { findRecentRouterSamples, insertRouterSample } from "@/db/repositories/router.repo";
import { isIpAddress } from "@/lib/validation";
import { fetchModelMetrics, isMlConfigured } from "@/services/ml-service";
import { getSystemResourceBinary, isMikrotikBinaryConfigured, listTarpitAddressListBinary } from "@/services/mikrotik-binary-service";
import { isMikrotikConfigured, listTarpitAddressList } from "@/services/mikrotik-service";
import type { ApiResult, ApprovalRequest, ApprovalStatus, AuditEntry, ClassificationEvidence, DataSource, Detection, MitigationMode, MitigationPolicy, ModelMetrics, RouterHistoryPoint, RouterResource, SecurityOverview, ServiceStatus, TarpitEntry } from "@/types/security";

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

/** Dashboard trend data derived from `detections`; no fabricated traffic. */
export function getTrafficSeries(range: "1h" | "24h" | "7d"): Promise<ApiResult<TrafficPoint[]>> {
  return fromDatabaseOrMock(
    () => findTrafficSeries(range),
    () => [],
  );
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

/**
 * Global dashboard totals. When the database is unavailable the numbers fall
 * back to the loaded sample and are flagged `scoped: true` — never presented as
 * a global count.
 */
async function getTotals(): Promise<SecurityOverview["totals"]> {
  if (!env.databaseUrl()) {
    const detections = mockDetections;
    return {
      detections: detections.length,
      reconnaissance: detections.filter((row) => row.classification === "Reconnaissance").length,
      tarpitActive: mockTarpit.filter((row) => row.status === "Active").length,
      scoped: true,
    };
  }

  try {
    const [detectionCounts, tarpitActive] = await Promise.all([
      countDetections(),
      countActiveTarpitEntries(),
    ]);
    return {
      detections: detectionCounts.total,
      reconnaissance: detectionCounts.reconnaissance,
      tarpitActive,
      scoped: false,
    };
  } catch (error) {
    console.error("[security-service] totals read failed:", error);
    return {
      detections: mockDetections.length,
      reconnaissance: mockDetections.filter((row) => row.classification === "Reconnaissance").length,
      tarpitActive: mockTarpit.filter((row) => row.status === "Active").length,
      scoped: true,
    };
  }
}

export async function getSecurityOverview(): Promise<ApiResult<SecurityOverview>> {
  const [detections, tarpit, services, totals] = await Promise.all([
    getRecentDetections(100),
    getTarpitEntries(),
    getServiceStatuses(),
    getTotals(),
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
      totals,
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

// --- Router health ---------------------------------------------------------

/**
 * Live `/system/resource` read. Each successful read is stored as a sample so
 * the history chart has data; nothing is invented when the router is absent.
 */
export async function getRouterResource(): Promise<ApiResult<RouterResource>> {
  const generatedAt = now();

  if (isMikrotikBinaryConfigured()) {
    try {
      const resource = await getSystemResourceBinary();
      if (resource) {
        if (env.databaseUrl()) {
          try {
            await insertRouterSample(resource);
          } catch (error) {
            console.error("[security-service] router sample insert failed:", error);
          }
        }
        return { data: resource, source: "remote", generatedAt };
      }
    } catch (error) {
      console.error("[security-service] router resource read failed:", error);
    }
  }

  // No router configured/readable: report an explicit "not connected" snapshot
  // instead of inventing telemetry or failing the whole page.
  return {
    data: {
      boardName: "Tidak terhubung",
      routerOsVersion: "—",
      cpuLoadPercent: 0,
      freeMemoryMegabytes: 0,
      totalMemoryMegabytes: 0,
      memoryUsedPercent: 0,
      uptime: "—",
    },
    source: "mock",
    generatedAt,
  };
}

export function getRouterResourceHistory(limit = 120): Promise<ApiResult<RouterHistoryPoint[]>> {
  return fromDatabaseOrMock(() => findRecentRouterSamples(limit), () => []);
}

// --- Approval center -------------------------------------------------------

export async function getApprovals(status?: ApprovalStatus): Promise<ApiResult<ApprovalRequest[]>> {
  return fromDatabaseOrMock(
    () => findApprovals(status),
    () => [],
  );
}

export async function requestApproval(input: { detectionId: string; proposedAction: string; reason?: string }): Promise<ApprovalRequest> {
  if (!env.databaseUrl()) throw new Error("DATABASE_URL tidak dikonfigurasi.");
  if (!input.detectionId || !input.proposedAction) throw new Error("detectionId dan proposedAction wajib diisi.");
  return createApproval(input);
}

export async function decideApprovalRequest(
  id: string,
  decision: "approved" | "rejected",
  reason?: string,
  actor: { administrator: string; administratorId?: string } = { administrator: LOCAL_ACTOR },
): Promise<ApprovalRequest> {
  if (!env.databaseUrl()) throw new Error("DATABASE_URL tidak dikonfigurasi.");
  return decideApproval({ id, decision, reason, actor });
}

// --- Evidence --------------------------------------------------------------

export async function getEvidence(detectionId: string): Promise<ApiResult<ClassificationEvidence | null>> {
  return fromDatabaseOrMock(
    () => findEvidenceByDetection(detectionId),
    () => null,
  );
}

export async function storeEvidence(input: EvidenceInput): Promise<ClassificationEvidence> {
  if (!env.databaseUrl()) throw new Error("DATABASE_URL tidak dikonfigurasi.");
  return saveEvidence(input);
}

// --- Tarpit release / verify ----------------------------------------------

export async function releaseTarpitIp(ip: string, reason?: string, actor: { administrator: string; administratorId?: string } = { administrator: LOCAL_ACTOR }): Promise<TarpitEntry> {
  if (!env.databaseUrl()) throw new Error("DATABASE_URL tidak dikonfigurasi.");
  if (!isIpAddress(ip)) throw new Error("Alamat IP tidak valid.");
  return markTarpitReleased({ ip, reason, actor });
}

/**
 * Read-only verification against RouterOS. When RouterOS is not configured the
 * result is reported as "tidak dapat diverifikasi" instead of claiming success.
 */
export async function verifyTarpitIp(ip: string, actor: { administrator: string; administratorId?: string } = { administrator: LOCAL_ACTOR }): Promise<{ ip: string; present: boolean | null; detail: string }> {
  if (!isIpAddress(ip)) throw new Error("Alamat IP tidak valid.");
  if (!env.mikrotikApiUrl()) {
    return { ip, present: null, detail: "RouterOS belum dikonfigurasi; verifikasi tidak dapat dilakukan." };
  }

  // Binary API first (RouterOS 6.48.6), REST as the fallback transport.
  const entries = isMikrotikBinaryConfigured()
    ? await listTarpitAddressListBinary("reconshield-tarpit-active")
    : await listTarpitAddressList("reconshield-tarpit-active");
  const present = entries.includes(ip);

  if (env.databaseUrl()) {
    await markTarpitVerified({ ip, present, actor });
  }

  return { ip, present, detail: present ? "IP ditemukan di address-list." : "IP tidak ditemukan di address-list." };
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

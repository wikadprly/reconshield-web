import "server-only";

import { createApproval, decideApproval, findApprovals } from "@/db/repositories/approval.repo";
import { findRecentAuditEntries } from "@/db/repositories/audit.repo";
import { findEvidenceByDetection, saveEvidence, type EvidenceInput } from "@/db/repositories/evidence.repo";
import { countDetections, findActivity, findDetectionById, findRecentDetections, findTrafficSeries, type TrafficPoint } from "@/db/repositories/detection.repo";
import { findLatestModelMetrics } from "@/db/repositories/ml.repo";
import { findMitigationPolicy, saveMitigationPolicy } from "@/db/repositories/policy.repo";
import { findServiceStatuses } from "@/db/repositories/service.repo";
import { applyTarpit, countActiveTarpitEntries, findActiveTarpitEntries, findTarpitEntryByIp, markTarpitReleased, markTarpitVerified } from "@/db/repositories/tarpit.repo";
import { auditEntries as mockAudit, detections as mockDetections, mitigationPolicy as mockPolicy, modelMetrics as mockMetrics, services as mockServices, tarpitEntries as mockTarpit } from "@/data/mock-security";
import { env } from "@/lib/env";
import { parsePolicyPayload } from "@/lib/policy";
import { findRecentRouterSamples, insertRouterSample } from "@/db/repositories/router.repo";
import { evaluateTarpitGuard } from "@/lib/tarpit-guard";
import { assertOneOf, isIpAddress } from "@/lib/validation";
import { fetchModelMetrics, isMlConfigured } from "@/services/ml-service";
import { getSystemResourceBinary, isMikrotikBinaryConfigured, listTarpitAddressListBinary } from "@/services/mikrotik-binary-service";
import { addTarpitAddress, isMikrotikConfigured, listTarpitAddressList, removeTarpitAddress } from "@/services/mikrotik-service";
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

const ACTIVITY_WINDOW_MINUTES = 60;

/** Rolling activity window; falls back to sample counts so the panel is honest. */
async function getActivity(): Promise<SecurityOverview["activity"]> {
  const empty = {
    windowMinutes: ACTIVITY_WINDOW_MINUTES,
    recent: 0,
    previous: 0,
    reconnaissanceRecent: 0,
    referenceAt: new Date().toISOString(),
  };

  if (!env.databaseUrl()) return empty;

  try {
    const counts = await findActivity(ACTIVITY_WINDOW_MINUTES);
    return { ...counts, windowMinutes: ACTIVITY_WINDOW_MINUTES };
  } catch (error) {
    console.error("[security-service] activity read failed:", error);
    return empty;
  }
}

export async function getSecurityOverview(): Promise<ApiResult<SecurityOverview>> {
  const [detections, tarpit, services, totals, activity] = await Promise.all([
    getRecentDetections(100),
    getTarpitEntries(),
    getServiceStatuses(),
    getTotals(),
    getActivity(),
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
      activity,
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

export interface ApprovalDecisionOutcome {
  approval: ApprovalRequest;
  /** Present only when an approved request triggered a tarpit write. */
  mitigation: TarpitApplyOutcome | null;
  /** Why a mitigation did not run, when an approval succeeded but execution did not. */
  mitigationError?: string;
}

export async function decideApprovalRequest(
  id: string,
  decision: "approved" | "rejected",
  reason?: string,
  actor: { administrator: string; administratorId?: string } = { administrator: LOCAL_ACTOR },
): Promise<ApprovalDecisionOutcome> {
  if (!env.databaseUrl()) throw new Error("DATABASE_URL tidak dikonfigurasi.");
  const approval = await decideApproval({ id, decision, reason, actor });
  if (decision !== "approved") return { approval, mitigation: null };

  try {
    const mitigation = await applyTarpitForDetection({
      detectionId: approval.detectionId,
      reason,
      viaApproval: true,
      actor,
    });
    return { approval, mitigation };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eksekusi tarpit gagal.";
    console.error("[security-service] tarpit apply after approval failed:", error);
    return { approval, mitigation: null, mitigationError: message };
  }
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

// --- Dynamic Tarpit write path --------------------------------------------

export interface TarpitApplyOutcome {
  entry: TarpitEntry;
  /** True when RouterOS confirmed the address-list write. */
  applied: boolean;
  /** Guardrail decision or router outcome, for display and audit. */
  detail: string;
}

export interface TarpitReleaseOutcome {
  entry: TarpitEntry;
  /** True when RouterOS confirmed the removal. */
  routerRemoved: boolean;
  detail: string;
}

/**
 * Apply the Dynamic Tarpit to a detection: check policy guardrails, write the
 * address-list entry on RouterOS (Design A / A20), then record the entry and its
 * audit trail. Idempotent, and honest: when the router is unreachable or writes
 * are disabled the entry is stored as "Pending" with the reason instead of
 * pretending the mitigation happened.
 */
export async function applyTarpitForDetection(input: {
  detectionId: string;
  reason?: string;
  viaApproval?: boolean;
  actor?: { administrator: string; administratorId?: string };
}): Promise<TarpitApplyOutcome> {
  if (!env.databaseUrl()) throw new Error("DATABASE_URL tidak dikonfigurasi.");
  const actor = input.actor ?? { administrator: LOCAL_ACTOR };

  const detection = await findDetectionById(input.detectionId);
  if (!detection) throw new Error(`Insiden ${input.detectionId} tidak ditemukan.`);
  if (!isIpAddress(detection.sourceIp)) throw new Error(`IP sumber tidak valid: ${detection.sourceIp}`);

  const existing = await findTarpitEntryByIp(detection.sourceIp);
  if (existing && (existing.status === "Active" || existing.status === "Pending")) {
    return { entry: existing, applied: existing.status === "Active", detail: "IP sudah berada dalam mitigasi tarpit (idempoten)." };
  }

  const policy = await findMitigationPolicy();
  const guard = evaluateTarpitGuard({
    mode: policy.mode,
    classification: detection.classification,
    confidence: detection.confidence,
    confidenceThreshold: policy.confidenceThreshold,
    activeCount: await countActiveTarpitEntries(),
    maxActiveEntries: policy.maxActiveEntries,
    viaApproval: input.viaApproval,
  });
  if (!guard.allowed) throw new Error(guard.reason);

  const routerWrite = await addTarpitAddress(policy.addressList, detection.sourceIp);
  const result = await applyTarpit({
    ip: detection.sourceIp,
    detectionId: detection.id,
    durationMinutes: policy.durationMinutes,
    addressList: policy.addressList,
    status: routerWrite.ok ? "Active" : "Pending",
    actor,
    reason: input.reason,
    detail: routerWrite.detail,
  });

  return { entry: result.entry, applied: routerWrite.ok, detail: routerWrite.detail };
}

/**
 * Release an IP: remove the RouterOS address-list entry (Design A / A20) and mark
 * the stored entry Released with an audit trail. A disabled or unreachable router
 * is reported honestly rather than treated as success.
 */
export async function releaseTarpitIp(
  ip: string,
  reason?: string,
  actor: { administrator: string; administratorId?: string } = { administrator: LOCAL_ACTOR },
): Promise<TarpitReleaseOutcome> {
  if (!env.databaseUrl()) throw new Error("DATABASE_URL tidak dikonfigurasi.");
  if (!isIpAddress(ip)) throw new Error("Alamat IP tidak valid.");

  const existing = await findTarpitEntryByIp(ip);
  if (!existing) throw new Error(`IP ${ip} tidak ada di daftar tarpit.`);

  const routerWrite = await removeTarpitAddress(existing.addressList, ip);
  const entry = await markTarpitReleased({ ip, reason, actor });
  return { entry, routerRemoved: routerWrite.ok, detail: routerWrite.detail };
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

/**
 * Change the mitigation mode. Configuration only: it never touches the router and
 * is committed together with its audit entry.
 */
export async function requestMitigationMode(
  mode: MitigationMode,
  actor: { administrator: string; administratorId?: string; reason?: string } = { administrator: LOCAL_ACTOR },
): Promise<MitigationPolicy> {
  if (!env.databaseUrl()) throw new Error("DATABASE_URL tidak dikonfigurasi; kebijakan tidak bisa disimpan.");
  const validated = assertOneOf(mode, ["Automatic", "Manual"] as const, "mode");
  const current = await findMitigationPolicy();
  return saveMitigationPolicy(
    { ...current, mode: validated },
    { ...actor, reason: actor.reason ?? `Mode mitigasi diubah ke ${validated}.` },
  );
}

/** Release an IP from mitigation; thin alias kept for the settings/actions API. */
export function requestIpRelease(
  ip: string,
  reason?: string,
  actor: { administrator: string; administratorId?: string } = { administrator: LOCAL_ACTOR },
): Promise<TarpitReleaseOutcome> {
  return releaseTarpitIp(ip, reason, actor);
}

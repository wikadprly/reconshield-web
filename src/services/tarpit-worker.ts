import "server-only";

import { createApproval } from "@/db/repositories/approval.repo";
import { findWorkerCandidates, markDetectionMitigated } from "@/db/repositories/detection.repo";
import { findMitigationPolicy } from "@/db/repositories/policy.repo";
import { countActiveTarpitEntries, findTarpitEntryByIp } from "@/db/repositories/tarpit.repo";
import { decideWorkerAction } from "@/lib/tarpit-worker-policy";
import { env } from "@/lib/env";
import { applyTarpitForDetection } from "@/services/security-service";

/**
 * Background tarpit worker (proposal §6.2 langkah 6). One tick turns new
 * reconnaissance detections into mitigations:
 *
 *  - mode Automatic → `applyTarpitForDetection` (guardrail + rate limit still apply);
 *  - mode Manual    → a pending approval request, so the centre fills itself.
 *
 * It is honest and idempotent: below-threshold flows are ignored, detections that
 * already have an approval are never re-queued, and an IP already under tarpit has
 * its detection marked handled instead of written twice.
 */
export interface WorkerTickSummary {
  scanned: number;
  applied: number;
  /** Router write skipped/disabled, stored as Pending but detection handled. */
  pendingRouter: number;
  approvals: number;
  /** IP already mitigated; detection was just marked TARPIT. */
  synced: number;
  skipped: number;
  failed: number;
}

const EMPTY_SUMMARY: WorkerTickSummary = {
  scanned: 0,
  applied: 0,
  pendingRouter: 0,
  approvals: 0,
  synced: 0,
  skipped: 0,
  failed: 0,
};

export async function runTarpitWorkerTick(limit = 25): Promise<WorkerTickSummary> {
  const summary: WorkerTickSummary = { ...EMPTY_SUMMARY };
  if (!env.databaseUrl()) return summary;

  const policy = await findMitigationPolicy();
  const candidates = await findWorkerCandidates({
    confidenceThreshold: policy.confidenceThreshold,
    limit,
  });
  summary.scanned = candidates.length;

  let activeCount = await countActiveTarpitEntries();

  for (const detection of candidates) {
    const existing = await findTarpitEntryByIp(detection.sourceIp);
    const alreadyMitigated = existing?.status === "Active" || existing?.status === "Pending";

    const decision = decideWorkerAction({
      mode: policy.mode,
      classification: detection.classification,
      confidence: detection.confidence,
      confidenceThreshold: policy.confidenceThreshold,
      activeCount,
      maxActiveEntries: policy.maxActiveEntries,
      alreadyMitigated,
      hasExistingApproval: false,
    });

    if (decision.action === "skip") {
      if (alreadyMitigated && existing) {
        await markDetectionMitigated(detection.id, existing.status === "Active" ? "Active" : "Review");
        summary.synced += 1;
      } else {
        summary.skipped += 1;
      }
      continue;
    }

    try {
      if (decision.action === "request-approval") {
        await createApproval({
          detectionId: detection.id,
          proposedAction: "TARPIT",
          reason: `Worker otomatis (mode Manual): keyakinan ${detection.confidence}%.`,
        });
        summary.approvals += 1;
        continue;
      }

      const outcome = await applyTarpitForDetection({
        detectionId: detection.id,
        reason: "Eksekusi otomatis worker (mode Automatic).",
      });
      if (outcome.applied) {
        summary.applied += 1;
        activeCount += 1;
      } else {
        summary.pendingRouter += 1;
      }
    } catch (error) {
      summary.failed += 1;
      console.error(`[tarpit-worker] gagal memproses ${detection.id}:`, error);
    }
  }

  return summary;
}

let timer: NodeJS.Timeout | null = null;
let inFlight = false;

async function safeTick(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const summary = await runTarpitWorkerTick();
    const touched =
      summary.applied + summary.pendingRouter + summary.approvals + summary.synced + summary.failed;
    if (touched > 0) console.log("[tarpit-worker] tick", summary);
  } catch (error) {
    console.error("[tarpit-worker] tick gagal:", error);
  } finally {
    inFlight = false;
  }
}

/**
 * Start the polling loop. Safe to call more than once; the interval is created
 * only once. Returns a stop function. The timer is unref'd so it never keeps a
 * shutting-down process alive.
 */
export function startTarpitWorker(): () => void {
  if (timer) return stopTarpitWorker;
  const intervalMs = env.workerIntervalMs();
  console.log(`[tarpit-worker] aktif, interval ${intervalMs}ms`);
  void safeTick();
  timer = setInterval(() => void safeTick(), intervalMs);
  timer.unref?.();
  return stopTarpitWorker;
}

export function stopTarpitWorker(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  console.log("[tarpit-worker] berhenti");
}

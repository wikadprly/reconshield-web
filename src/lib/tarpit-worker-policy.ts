import type { MitigationMode } from "@/types/security";

/**
 * Pure decision step for the background tarpit worker. It mirrors the proposal
 * flow (docs/flow-web-dan-tugas-admin.md §3.2): a reconnaissance detection above
 * the confidence threshold is mitigated immediately in Automatic mode, or turned
 * into an approval request in Manual mode. Everything else is left untouched for
 * an administrator to review.
 *
 * Keeping this pure makes the routing testable without a database; the service
 * layer supplies the live policy and repository counts.
 */
export interface WorkerDecisionInput {
  mode: MitigationMode;
  classification: string;
  confidence: number;
  confidenceThreshold: number;
  activeCount: number;
  maxActiveEntries: number;
  /** The source IP already has an Active/Pending tarpit entry. */
  alreadyMitigated: boolean;
  /** An approval already exists for this detection (any status). */
  hasExistingApproval: boolean;
}

export type WorkerDecision =
  | { action: "apply"; reason: string }
  | { action: "request-approval"; reason: string }
  | { action: "skip"; reason: string };

export function decideWorkerAction(input: WorkerDecisionInput): WorkerDecision {
  if (input.classification !== "Reconnaissance") {
    return { action: "skip", reason: "Klasifikasi bukan Reconnaissance." };
  }
  if (input.alreadyMitigated) {
    return { action: "skip", reason: "IP sumber sudah berada dalam mitigasi tarpit." };
  }
  if (input.hasExistingApproval) {
    return { action: "skip", reason: "Deteksi sudah memiliki permintaan persetujuan." };
  }
  if (input.confidence < input.confidenceThreshold) {
    return {
      action: "skip",
      reason: `Keyakinan ${input.confidence}% di bawah ambang ${input.confidenceThreshold}%.`,
    };
  }

  if (input.mode === "Manual") {
    return { action: "request-approval", reason: "Mode Manual: menunggu persetujuan admin." };
  }

  if (input.activeCount >= input.maxActiveEntries) {
    return {
      action: "skip",
      reason: `Batas entri aktif tercapai (${input.activeCount}/${input.maxActiveEntries}).`,
    };
  }

  return { action: "apply", reason: "Mode Automatic: eksekusi tarpit otomatis." };
}

import type { MitigationMode } from "@/types/security";

/**
 * Pure eligibility check run before any router write. Mirrors the policy engine
 * in docs/flow-web-dan-tugas-admin.md §3.2: only reconnaissance flows, above the
 * confidence threshold (unless an administrator approved that detection), and
 * within the configured cap on active entries.
 */
export interface TarpitGuardInput {
  mode: MitigationMode;
  classification: string;
  confidence: number;
  confidenceThreshold: number;
  activeCount: number;
  maxActiveEntries: number;
  /** True when an administrator approved this specific detection. */
  viaApproval?: boolean;
}

export type TarpitGuardResult = { allowed: true } | { allowed: false; reason: string };

export function evaluateTarpitGuard(input: TarpitGuardInput): TarpitGuardResult {
  if (input.classification !== "Reconnaissance") {
    return { allowed: false, reason: "Klasifikasi bukan Reconnaissance." };
  }
  if (input.mode === "Manual" && !input.viaApproval) {
    return { allowed: false, reason: "Mode Manual: mitigasi memerlukan persetujuan admin." };
  }
  if (!input.viaApproval && input.confidence < input.confidenceThreshold) {
    return {
      allowed: false,
      reason: `Keyakinan ${input.confidence}% di bawah ambang ${input.confidenceThreshold}%.`,
    };
  }
  if (input.activeCount >= input.maxActiveEntries) {
    return {
      allowed: false,
      reason: `Batas entri aktif tercapai (${input.activeCount}/${input.maxActiveEntries}).`,
    };
  }
  return { allowed: true };
}

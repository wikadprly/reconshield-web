import "server-only";

import { getPrisma } from "@/db/prisma";
import { assertOneOf } from "@/lib/validation";
import type { ApprovalRequest, ApprovalStatus } from "@/types/security";

const STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;
const DECISION_STATUSES = ["approved", "rejected"] as const;

type ApprovalRow = {
  id: string;
  detectionId: string;
  proposedAction: string;
  status: string;
  requestedAt: Date;
  decidedAt: Date | null;
  decidedById: string | null;
  reason: string | null;
  detection?: { sourceIp: string; confidence: number; classification: string };
};

function toApproval(row: ApprovalRow): ApprovalRequest {
  return {
    id: row.id,
    detectionId: row.detectionId,
    proposedAction: row.proposedAction,
    status: assertOneOf<ApprovalStatus>(row.status, STATUSES, "approval.status"),
    requestedAt: row.requestedAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString(),
    decidedById: row.decidedById ?? undefined,
    reason: row.reason ?? undefined,
    detection: row.detection
      ? {
          sourceIp: row.detection.sourceIp,
          confidence: row.detection.confidence,
          classification: row.detection.classification,
        }
      : undefined,
  };
}

export async function findApprovals(status?: ApprovalStatus, limit = 50): Promise<ApprovalRequest[]> {
  const rows = await getPrisma().approval.findMany({
    where: status ? { status } : undefined,
    orderBy: { requestedAt: "desc" },
    take: limit,
    include: { detection: { select: { sourceIp: true, confidence: true, classification: true } } },
  });
  return rows.map(toApproval);
}

export async function createApproval(input: {
  detectionId: string;
  proposedAction: string;
  reason?: string;
}): Promise<ApprovalRequest> {
  const row = await getPrisma().approval.create({
    data: {
      detectionId: input.detectionId,
      proposedAction: input.proposedAction,
      status: "pending",
      reason: input.reason ?? null,
    },
    include: { detection: { select: { sourceIp: true, confidence: true, classification: true } } },
  });
  return toApproval(row);
}

/**
 * Decide an approval and write the audit entry in one transaction. The audit
 * entry is keyed on the detection's implied mitigation action, not on a mode
 * change, so the trail shows what the administrator actually approved.
 */
export async function decideApproval(input: {
  id: string;
  decision: (typeof DECISION_STATUSES)[number];
  reason?: string;
  actor: { administrator: string; administratorId?: string };
}): Promise<ApprovalRequest> {
  const prisma = getPrisma();
  const decision = assertOneOf(input.decision, DECISION_STATUSES, "approval.decision");

  return prisma.$transaction(async (tx) => {
    const current = await tx.approval.findUnique({ where: { id: input.id } });
    if (!current) throw new Error("Permintaan persetujuan tidak ditemukan.");
    if (current.status !== "pending") {
      throw new Error(`Persetujuan sudah diputuskan (${current.status}).`);
    }

    const updated = await tx.approval.update({
      where: { id: input.id },
      data: {
        status: decision,
        decidedAt: new Date(),
        decidedById: input.actor.administratorId ?? null,
        reason: input.reason ?? current.reason,
      },
      include: { detection: { select: { sourceIp: true, confidence: true, classification: true } } },
    });

    await tx.auditEntry.create({
      data: {
        timestamp: new Date(),
        administrator: input.actor.administrator,
        administratorId: input.actor.administratorId ?? null,
        previousMode: "Pending",
        newMode: decision === "approved" ? "TARPIT" : "Blocked",
        action: decision === "approved" ? "approval_approved" : "approval_rejected",
        target: updated.detectionId,
        reason: input.reason ?? `Persetujuan ${decision} untuk ${updated.detectionId}`,
      },
    });

    return toApproval(updated);
  });
}

import "server-only";

import { getPrisma } from "@/db/prisma";
import { assertOneOf } from "@/lib/validation";
import type { MitigationMode, MitigationPolicy } from "@/types/security";

const MODES = ["Automatic", "Manual"] as const;
const DEFAULT_ID = "default";

function toPolicy(row: {
  mode: string;
  confidenceThreshold: number;
  durationMinutes: number;
  maxDurationMinutes: number;
  maxActiveEntries: number;
  addressList: string;
  updatedAt: Date;
  updatedBy: string | null;
}): MitigationPolicy {
  return {
    mode: assertOneOf<MitigationMode>(row.mode, MODES, "mitigationSetting.mode"),
    confidenceThreshold: row.confidenceThreshold,
    durationMinutes: row.durationMinutes,
    maxDurationMinutes: row.maxDurationMinutes,
    maxActiveEntries: row.maxActiveEntries,
    addressList: row.addressList,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy ?? undefined,
  };
}

export async function findMitigationPolicy(): Promise<MitigationPolicy> {
  const row = await getPrisma().mitigationSetting.findUnique({ where: { id: DEFAULT_ID } });
  if (!row) {
    throw new Error("Kebijakan mitigasi belum ada di database (jalankan db:seed).");
  }
  return toPolicy(row);
}

/**
 * Persist a policy change and its audit entry in one transaction. The audit
 * entry is the evidence that an administrator changed the policy; it is never
 * written separately from the change itself.
 */
export async function saveMitigationPolicy(
  next: MitigationPolicy,
  actor: { administrator: string; administratorId?: string; reason?: string },
): Promise<MitigationPolicy> {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const previous = await tx.mitigationSetting.findUnique({ where: { id: DEFAULT_ID } });
    if (!previous) {
      throw new Error("Kebijakan mitigasi belum ada di database (jalankan db:seed).");
    }

    const updated = await tx.mitigationSetting.update({
      where: { id: DEFAULT_ID },
      data: {
        mode: next.mode,
        confidenceThreshold: next.confidenceThreshold,
        durationMinutes: next.durationMinutes,
        maxDurationMinutes: next.maxDurationMinutes,
        maxActiveEntries: next.maxActiveEntries,
        addressList: next.addressList,
        updatedBy: actor.administrator,
      },
    });

    await tx.auditEntry.create({
      data: {
        timestamp: new Date(),
        administrator: actor.administrator,
        administratorId: actor.administratorId ?? null,
        previousMode: previous.mode,
        newMode: updated.mode,
        action: "policy_change",
        reason: actor.reason ?? null,
      },
    });

    return toPolicy(updated);
  });
}

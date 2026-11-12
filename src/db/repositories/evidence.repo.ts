import "server-only";

import { getPrisma } from "@/db/prisma";
import type { ClassificationEvidence, MitigationPolicy } from "@/types/security";

function toEvidence(row: {
  detectionId: string;
  flowDirection: string;
  features: unknown;
  featureCount: number;
  confidence: number;
  modelName: string;
  modelVersion: string;
  policyVersion: string;
  policySnapshot: unknown;
  createdAt: Date;
}): ClassificationEvidence {
  return {
    detectionId: row.detectionId,
    flowDirection: row.flowDirection,
    features: (row.features ?? {}) as Record<string, number>,
    featureCount: row.featureCount,
    confidence: row.confidence,
    modelName: row.modelName,
    modelVersion: row.modelVersion,
    policyVersion: row.policyVersion,
    policySnapshot: row.policySnapshot as MitigationPolicy,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findEvidenceByDetection(detectionId: string): Promise<ClassificationEvidence | null> {
  const row = await getPrisma().evidence.findUnique({ where: { detectionId } });
  return row ? toEvidence(row) : null;
}

export interface EvidenceInput {
  detectionId: string;
  flowDirection?: string;
  features: Record<string, number>;
  confidence: number;
  modelName: string;
  modelVersion: string;
  policyVersion: string;
  policySnapshot: MitigationPolicy;
}

/**
 * Store the evidence for a decision. The 16-feature contract is enforced here:
 * an incomplete snapshot is rejected instead of being stored as if complete.
 */
export async function saveEvidence(input: EvidenceInput): Promise<ClassificationEvidence> {
  if (Object.keys(input.features).length !== 16) {
    throw new Error("Bukti klasifikasi harus memuat tepat 16 fitur.");
  }

  const row = await getPrisma().evidence.create({
    data: {
      detectionId: input.detectionId,
      flowDirection: input.flowDirection ?? "external_to_protected",
      features: input.features,
      featureCount: 16,
      confidence: input.confidence,
      modelName: input.modelName,
      modelVersion: input.modelVersion,
      policyVersion: input.policyVersion,
      policySnapshot: { ...input.policySnapshot },
    },
  });

  return toEvidence(row);
}

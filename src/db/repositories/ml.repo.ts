import "server-only";

import { getPrisma } from "@/db/prisma";
import type { ModelMetrics } from "@/types/security";

export async function findLatestModelMetrics(): Promise<ModelMetrics | null> {
  const row = await getPrisma().modelEvaluation.findFirst({
    orderBy: { evaluatedAt: "desc" },
    include: { features: true },
  });

  if (!row) return null;

  return {
    modelName: row.modelName,
    version: row.version,
    accuracy: row.accuracy,
    precision: row.precision,
    recall: row.recall,
    f1Score: row.f1Score,
    confusionMatrix: {
      trueNormal: row.trueNormal,
      falseThreat: row.falseThreat,
      missedThreat: row.missedThreat,
      trueThreat: row.trueThreat,
    },
    featureImportance: row.features.map((feature) => ({
      feature: feature.feature,
      importance: feature.importance,
    })),
    dataset: row.dataset ?? undefined,
    evaluatedAt: row.evaluatedAt.toISOString(),
  };
}

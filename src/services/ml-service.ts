import "server-only";

import { env } from "@/lib/env";
import { requestJson } from "@/lib/http";
import type { ModelMetrics } from "@/types/security";

/**
 * Client for the Python preprocessing / Random Forest inference service.
 *
 * The endpoint paths below are the expected integration contract. They are read
 * only and must be confirmed against the actual Python service before being
 * relied upon. No credentials are required for the read metrics endpoint yet.
 */
export function isMlConfigured(): boolean {
  return Boolean(env.pythonMlApiUrl());
}

export async function fetchModelMetrics(): Promise<ModelMetrics | null> {
  const baseUrl = env.pythonMlApiUrl();
  if (!baseUrl) return null;

  return requestJson<ModelMetrics>(`${baseUrl.replace(/\/$/, "")}/model/metrics`, {
    timeoutMs: 5000,
  });
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiResult } from "@/types/security";

export interface ApiResultState<T> {
  result: ApiResult<T> | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetch an ApiResult<T> envelope from one of the app's read-only API routes.
 * The route runs the server service layer (database → remote → mock), so the
 * returned `source` always reflects where the data actually came from.
 */
export function useApiResult<T>(path: string): ApiResultState<T> {
  const [result, setResult] = useState<ApiResult<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(path, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as ApiResult<T> | { error: string };
        if (!response.ok) {
          throw new Error("error" in body ? body.error : `Request failed with ${response.status}`);
        }
        if (!cancelled) setResult(body as ApiResult<T>);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  useEffect(() => refresh(), [refresh]);

  return { result, loading, error, refresh };
}

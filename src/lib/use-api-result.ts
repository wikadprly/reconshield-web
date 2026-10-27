"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  // Cancel handle of the request currently in flight. A manual refresh() used
  // to leave the previous request running, so a slow older response could
  // overwrite a newer one (T9).
  const inFlight = useRef<(() => void) | null>(null);

  const refresh = useCallback(() => {
    inFlight.current?.();
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
    };
    inFlight.current = cancel;
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

    return cancel;
  }, [path]);

  useEffect(() => refresh(), [refresh]);

  return { result, loading, error, refresh };
}

/**
 * Shared helpers for the read-only JSON API routes. These routes are the bridge
 * between Client Components and the server-only service layer.
 */
export function serviceError(error: unknown): Response {
  console.error("[api] service read failed:", error);
  const message = error instanceof Error ? error.message : "Data source is unavailable.";
  return Response.json({ error: message }, { status: 503 });
}

/** Clamp a `?limit=` query value to a safe integer within [1, max]. */
export function readLimit(url: string, fallback: number, max = 500): number {
  const raw = new URL(url).searchParams.get("limit");
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(parsed)));
}

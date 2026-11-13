/**
 * Next.js instrumentation hook (stable in Next 16). Runs once when the Node.js
 * server boots. When the background tarpit worker is enabled we start its poll
 * loop here, so `next start` alone is enough for Automatic mode to mitigate
 * without a manual click. Everything stays off unless RECONSHIELD_ENABLE_WORKER
 * is exactly "true", so builds and previews never start it.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { env } = await import("@/lib/env");
  if (!env.workerEnabled()) return;

  const { startTarpitWorker } = await import("@/services/tarpit-worker");
  startTarpitWorker();
}

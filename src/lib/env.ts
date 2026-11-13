import "server-only";

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : undefined;
}

/**
 * Central, server-only access to configuration. Secrets are read lazily so the
 * module can be imported during build without throwing, and nothing here is ever
 * exposed to the client bundle.
 */
export const env = {
  databaseUrl: () => read("DATABASE_URL"),
  pythonMlApiUrl: () => read("PYTHON_ML_API_URL"),
  mikrotikApiUrl: () => read("MIKROTIK_API_URL"),
  mikrotikUsername: () => read("MIKROTIK_USERNAME"),
  mikrotikPassword: () => read("MIKROTIK_PASSWORD"),
  /** Mock data is opt-out: it is used unless explicitly disabled. */
  useMockData: () => read("RECONSHIELD_USE_MOCK_DATA") !== "false",
  /**
   * Router writes are opt-in. Even with RouterOS configured, nothing is written
   * to the device unless this is exactly "true".
   */
  routerWritesEnabled: () => read("RECONSHIELD_ENABLE_ROUTER_WRITES") === "true",
  maxRouterWritesPerMinute: () => {
    const parsed = Number(read("RECONSHIELD_MAX_ROUTER_WRITES_PER_MINUTE") ?? "5");
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 30) : 5;
  },
  /**
   * The background tarpit worker is opt-in. When enabled it polls detections and
   * turns them into mitigations (Automatic) or approval requests (Manual),
   * still subject to every guardrail and to `routerWritesEnabled`.
   */
  workerEnabled: () => read("RECONSHIELD_ENABLE_WORKER") === "true",
  workerIntervalMs: () => {
    const parsed = Number(read("RECONSHIELD_WORKER_INTERVAL_MS") ?? "10000");
    if (!Number.isFinite(parsed) || parsed <= 0) return 10_000;
    return Math.min(Math.max(parsed, 2_000), 300_000);
  },
};

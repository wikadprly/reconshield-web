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
};

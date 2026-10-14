import "server-only";

/** Minimal validation helpers shared by the service and (future) API layers. */

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;

export function isIpAddress(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  if (!IPV4.test(value)) return false;
  return value.split(".").every((part) => Number(part) >= 0 && Number(part) <= 255);
}

export function assertOneOf<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  throw new Error(`${label} must be one of: ${allowed.join(", ")}`);
}

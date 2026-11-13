import "server-only";

import { env } from "@/lib/env";
import { basicAuthHeader, requestJson } from "@/lib/http";
import { createRateLimiter, type RateLimiter } from "@/lib/rate-limit";

/**
 * Server-only client for the MikroTik RouterOS REST API.
 *
 * RouterOS is reached exclusively from the server. Credentials never leave this
 * module and must never be sent to, or read by, the browser. Only read
 * operations are implemented in the current (read-only) phase.
 */
export function isMikrotikConfigured(): boolean {
  return Boolean(env.mikrotikApiUrl() && env.mikrotikUsername() && env.mikrotikPassword());
}

interface RouterOsAddressListEntry {
  address?: string;
  list?: string;
  disabled?: string;
}

function authHeaders(): Record<string, string> {
  const username = env.mikrotikUsername();
  const password = env.mikrotikPassword();
  if (!username || !password) {
    throw new Error("Kredensial MikroTik belum dikonfigurasi");
  }
  return { Authorization: basicAuthHeader(username, password) };
}

let writeLimiter: RateLimiter | undefined;

/** Shared limiter so every router write respects the same per-minute budget. */
function routerWriteLimiter(): RateLimiter {
  if (!writeLimiter) {
    writeLimiter = createRateLimiter({ limit: env.maxRouterWritesPerMinute() });
  }
  return writeLimiter;
}

/**
 * Reserve one slot in the per-minute router-write budget. Returns a refusal
 * detail instead of throwing so the caller can record an honest audit entry.
 */
function acquireWriteSlot(): { ok: true } | { ok: false; detail: string } {
  const decision = routerWriteLimiter().tryAcquire();
  if (decision.allowed) return { ok: true };
  return {
    ok: false,
    detail: `Batas tulis router (${env.maxRouterWritesPerMinute()}/menit) tercapai; coba lagi dalam ${Math.ceil(decision.retryAfterMs / 1000)} detik.`,
  };
}

export async function listTarpitAddressList(addressList: string): Promise<string[]> {
  const baseUrl = env.mikrotikApiUrl();
  if (!baseUrl) return [];

  const query = new URLSearchParams({ list: addressList });
  const entries = await requestJson<RouterOsAddressListEntry[]>(
    `${baseUrl.replace(/\/$/, "")}/rest/ip/firewall/address-list?${query.toString()}`,
    { headers: authHeaders(), timeoutMs: 5000 },
  );

  return entries.map((entry) => entry.address).filter((address): address is string => Boolean(address));
}
/**
 * Add one address to a tarpit address-list. The firewall rule that actually
 * tarpits traffic (`action=tarpit`) must already exist on the device; this call
 * only manages list membership. Writes require RECONSHIELD_ENABLE_ROUTER_WRITES.
 */
export async function addTarpitAddress(addressList: string, ip: string): Promise<{ ok: boolean; detail: string }> {
  if (!env.routerWritesEnabled()) {
    return { ok: false, detail: "Write path dinonaktifkan (RECONSHIELD_ENABLE_ROUTER_WRITES bukan \"true\")." };
  }
  const baseUrl = env.mikrotikApiUrl();
  if (!baseUrl) {
    return { ok: false, detail: "RouterOS belum dikonfigurasi." };
  }

  const slot = acquireWriteSlot();
  if (!slot.ok) return slot;

  await requestJson<unknown>(`${baseUrl.replace(/\/$/, "")}/rest/ip/firewall/address-list`, {
    method: "POST",
    headers: authHeaders(),
    body: { list: addressList, address: ip, comment: "ReconShield dynamic tarpit" },
    timeoutMs: 5000,
  });

  return { ok: true, detail: `IP ${ip} ditambahkan ke ${addressList}.` };
}

/** Remove one address from an address-list. Same opt-in gate as adding. */
export async function removeTarpitAddress(addressList: string, ip: string): Promise<{ ok: boolean; detail: string }> {
  if (!env.routerWritesEnabled()) {
    return { ok: false, detail: "Write path dinonaktifkan (RECONSHIELD_ENABLE_ROUTER_WRITES bukan \"true\")." };
  }
  const baseUrl = env.mikrotikApiUrl();
  if (!baseUrl) {
    return { ok: false, detail: "RouterOS belum dikonfigurasi." };
  }

  const slot = acquireWriteSlot();
  if (!slot.ok) return slot;

  const query = new URLSearchParams({ list: addressList, address: ip });
  const existing = await requestJson<Array<{ ".id"?: string }>>(
    `${baseUrl.replace(/\/$/, "")}/rest/ip/firewall/address-list?${query.toString()}`,
    { headers: authHeaders(), timeoutMs: 5000 },
  );
  const rowId = existing.find((entry) => entry[".id"])?.[".id"];
  if (!rowId) {
    return { ok: false, detail: `IP ${ip} tidak ditemukan di ${addressList}.` };
  }

  await requestJson<unknown>(`${baseUrl.replace(/\/$/, "")}/rest/ip/firewall/address-list/${rowId}`, {
    method: "DELETE",
    headers: authHeaders(),
    timeoutMs: 5000,
  });

  return { ok: true, detail: `IP ${ip} dihapus dari ${addressList}.` };
}
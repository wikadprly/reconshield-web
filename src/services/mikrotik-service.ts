import "server-only";

import { env } from "@/lib/env";
import { basicAuthHeader, requestJson } from "@/lib/http";

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
    throw new Error("MikroTik credentials are not configured");
  }
  return { Authorization: basicAuthHeader(username, password) };
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

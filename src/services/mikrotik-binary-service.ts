import "server-only";

import { env } from "@/lib/env";
import type { RouterResource } from "@/types/security";

/**
 * RouterOS binary API (port 8728) client. The lab runs RouterOS 6.48.6, where
 * REST is limited, so the binary API is the reliable transport. Read-only in
 * this phase: no address-list or firewall writes happen here.
 */
export function isMikrotikBinaryConfigured(): boolean {
  return Boolean(env.mikrotikApiUrl());
}

interface AddressListEntry {
  address?: string;
  list?: string;
  timeout?: string;
  comment?: string;
  dynamic?: string;
  disabled?: string;
}

interface SystemResource {
  "cpu-load"?: string;
  "free-memory"?: string;
  "total-memory"?: string;
  uptime?: string;
  "board-name"?: string;
  version?: string;
}

function parseHost(value: string): string {
  // MIKROTIK_API_URL may be a full URL ("http://10.10.30.1") or a bare host.
  try {
    return new URL(value).hostname;
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

async function withConnection<T>(work: (conn: RouterOsConnection) => Promise<T>): Promise<T> {
  const host = env.mikrotikApiUrl();
  if (!host) throw new Error("RouterOS belum dikonfigurasi");

  // Loaded lazily so a build without router access does not pull it in.
  const { RouterOSAPI } = await import("node-routeros");
  const conn = new RouterOSAPI({
    host: parseHost(host),
    user: env.mikrotikUsername() || "admin",
    password: env.mikrotikPassword() || "",
    port: 8728,
    timeout: 5000,
  }) as unknown as RouterOsConnection;

  await conn.connect();
  try {
    return await work(conn);
  } finally {
    try {
      await conn.close();
    } catch {
      // Closing a dead socket is not an error worth surfacing.
    }
  }
}

interface RouterOsConnection {
  connect: () => Promise<void>;
  close: () => Promise<void>;
  write: (words: string[]) => Promise<unknown[]>;
}

export async function listTarpitAddressListBinary(addressList: string): Promise<string[]> {
  const result = await withConnection(async (conn) =>
    conn.write(["/ip/firewall/address-list/print", `?list=${addressList}`]),
  );

  return (result as AddressListEntry[])
    .map((entry) => entry.address)
    .filter((address): address is string => Boolean(address));
}

function toMegabytes(raw: string | undefined): number {
  const bytes = Number(raw ?? "0");
  return Number.isFinite(bytes) && bytes > 0 ? Math.round((bytes / (1024 * 1024)) * 10) / 10 : 0;
}

export async function getSystemResourceBinary(): Promise<RouterResource | null> {
  const result = await withConnection(async (conn) => conn.write(["/system/resource/print"]));
  const resource = (result as SystemResource[])[0];
  if (!resource) return null;

  const total = toMegabytes(resource["total-memory"]);
  const free = toMegabytes(resource["free-memory"]);

  return {
    boardName: resource["board-name"] ?? "Tidak diketahui",
    routerOsVersion: resource.version ?? "Tidak diketahui",
    cpuLoadPercent: Number(resource["cpu-load"] ?? 0),
    freeMemoryMegabytes: free,
    totalMemoryMegabytes: total,
    memoryUsedPercent: total > 0 ? Math.round(((total - free) / total) * 1000) / 10 : 0,
    uptime: resource.uptime ?? "—",
  };
}

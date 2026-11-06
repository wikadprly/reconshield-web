import "server-only";

import { env } from "@/lib/env";

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

export async function listTarpitAddressListBinary(addressList: string): Promise<string[]> {
  const host = env.mikrotikApiUrl();
  if (!host) return [];

  const username = env.mikrotikUsername() || "admin";
  const password = env.mikrotikPassword() || "";

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { RouterOSAPI } = require("node-routeros");
    const conn = new RouterOSAPI({
      host,
      user: username,
      password,
      port: 8728,
      timeout: 5000,
    });

    await conn.connect();
    const result: AddressListEntry[] = await conn.write([
      "/ip/firewall/address-list/print",
      `?list=${addressList}`,
    ]);
    await conn.close();

    return result
      .map((entry) => entry.address)
      .filter((address): address is string => Boolean(address));
  } catch (error) {
    console.error("[mikrotik-binary-service] failed to list address-list:", error);
    throw error;
  }
}

export async function getSystemResourceBinary(): Promise<SystemResource | null> {
  const host = env.mikrotikApiUrl();
  if (!host) return null;

  const username = env.mikrotikUsername() || "admin";
  const password = env.mikrotikPassword() || "";

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { RouterOSAPI } = require("node-routeros");
    const conn = new RouterOSAPI({
      host,
      user: username,
      password,
      port: 8728,
      timeout: 5000,
    });

    await conn.connect();
    const result: SystemResource[] = await conn.write(["/system/resource/print"]);
    await conn.close();
    return result[0] || null;
  } catch (error) {
    console.error("[mikrotik-binary-service] failed to get system/resource:", error);
    return null;
  }
}

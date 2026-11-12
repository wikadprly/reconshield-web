import "server-only";

import { getPrisma } from "@/db/prisma";
import { assertOneOf } from "@/lib/validation";
import type { TarpitEntry, TarpitStatus } from "@/types/security";

const STATUSES = ["Pending", "Active", "Released", "Expired", "Verified"] as const;

type TarpitRow = {
  id: string;
  ip: string;
  detectedAt: Date;
  duration: string;
  durationMinutes: number;
  expiresAt: Date | null;
  addressList: string;
  status: string;
  releasedAt: Date | null;
  verifiedAt: Date | null;
  detectionId: string | null;
};

function toTarpit(row: TarpitRow): TarpitEntry {
  return {
    id: row.id,
    ip: row.ip,
    detectedAt: row.detectedAt.toISOString(),
    duration: row.duration,
    durationMinutes: row.durationMinutes,
    expiresAt: row.expiresAt?.toISOString(),
    addressList: row.addressList,
    status: assertOneOf<TarpitStatus>(row.status, STATUSES, "tarpitEntry.status"),
    releasedAt: row.releasedAt?.toISOString(),
    verifiedAt: row.verifiedAt?.toISOString(),
    detectionId: row.detectionId ?? undefined,
  };
}

export async function findActiveTarpitEntries(): Promise<TarpitEntry[]> {
  const rows = await getPrisma().tarpitEntry.findMany({
    where: { status: { in: ["Active", "Pending"] } },
    orderBy: { detectedAt: "desc" },
  });
  return rows.map(toTarpit);
}

export async function findAllTarpitEntries(limit = 100): Promise<TarpitEntry[]> {
  const rows = await getPrisma().tarpitEntry.findMany({
    orderBy: { detectedAt: "desc" },
    take: limit,
  });
  return rows.map(toTarpit);
}

export async function findTarpitEntryByIp(ip: string): Promise<TarpitEntry | null> {
  const row = await getPrisma().tarpitEntry.findUnique({ where: { ip } });
  return row ? toTarpit(row) : null;
}

/** Global count of address-list entries still under mitigation. */
export async function countActiveTarpitEntries(): Promise<number> {
  return getPrisma().tarpitEntry.count({ where: { status: { in: ["Active", "Pending"] } } });
}

/**
 * Release an IP from tarpit and record the audit entry in one transaction.
 * Router-side removal is done by the caller; this touches the database only.
 */
export async function markTarpitReleased(input: {
  ip: string;
  reason?: string;
  actor: { administrator: string; administratorId?: string };
}): Promise<TarpitEntry> {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const current = await tx.tarpitEntry.findUnique({ where: { ip: input.ip } });
    if (!current) throw new Error(`IP ${input.ip} tidak ada di daftar tarpit.`);
    if (current.status === "Released" || current.status === "Expired") {
      throw new Error(`IP ${input.ip} sudah tidak aktif (${current.status}).`);
    }

    const updated = await tx.tarpitEntry.update({
      where: { ip: input.ip },
      data: { status: "Released", releasedAt: new Date() },
    });

    await tx.auditEntry.create({
      data: {
        timestamp: new Date(),
        administrator: input.actor.administrator,
        administratorId: input.actor.administratorId ?? null,
        previousMode: current.status,
        newMode: "Released",
        action: "tarpit_release",
        target: input.ip,
        reason: input.reason ?? null,
      },
    });

    return toTarpit(updated);
  });
}

/** Record the outcome of a read-only RouterOS verification check. */
export async function markTarpitVerified(input: {
  ip: string;
  present: boolean;
  actor: { administrator: string; administratorId?: string };
}): Promise<TarpitEntry> {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const current = await tx.tarpitEntry.findUnique({ where: { ip: input.ip } });
    if (!current) throw new Error(`IP ${input.ip} tidak ada di daftar tarpit.`);

    const updated = await tx.tarpitEntry.update({
      where: { ip: input.ip },
      data: input.present
        ? { status: "Verified", verifiedAt: new Date() }
        : { status: current.status },
    });

    await tx.auditEntry.create({
      data: {
        timestamp: new Date(),
        administrator: input.actor.administrator,
        administratorId: input.actor.administratorId ?? null,
        previousMode: current.status,
        newMode: input.present ? "Verified" : "NotInAddressList",
        action: "tarpit_verify",
        target: input.ip,
        reason: input.present
          ? "Ditemukan di address-list RouterOS"
          : "Tidak ditemukan di address-list RouterOS",
      },
    });

    return toTarpit(updated);
  });
}

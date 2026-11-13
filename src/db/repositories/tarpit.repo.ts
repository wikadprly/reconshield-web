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

export interface ApplyTarpitInput {
  ip: string;
  detectionId?: string;
  durationMinutes: number;
  addressList: string;
  /** "Active" once the router confirmed the write, "Pending" when it is intent only. */
  status: "Active" | "Pending";
  actor: { administrator: string; administratorId?: string };
  reason?: string;
  /** Router outcome / guardrail note stored on the audit entry. */
  detail?: string;
}

export interface ApplyTarpitResult {
  entry: TarpitEntry;
  /** False when the IP was already under mitigation (idempotent no-op). */
  created: boolean;
}

/**
 * Record a Dynamic Tarpit intent or confirmed application and its audit entry in
 * one transaction. Router-side changes are done by the caller (the database must
 * not be the one that lies about a router write). Idempotent: an IP already under
 * mitigation is returned untouched so repeat detections never double-apply.
 */
export async function applyTarpit(input: ApplyTarpitInput): Promise<ApplyTarpitResult> {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const current = await tx.tarpitEntry.findUnique({ where: { ip: input.ip } });

    if (current && (current.status === "Active" || current.status === "Pending")) {
      return { entry: toTarpit(current), created: false };
    }

    const at = new Date();
    const expiresAt = new Date(at.getTime() + input.durationMinutes * 60_000);
    const duration = `${input.durationMinutes} menit`;

    const saved = current
      ? await tx.tarpitEntry.update({
          where: { ip: input.ip },
          data: {
            detectedAt: at,
            duration,
            durationMinutes: input.durationMinutes,
            expiresAt,
            addressList: input.addressList,
            status: input.status,
            releasedAt: null,
            verifiedAt: null,
            detectionId: input.detectionId ?? current.detectionId,
          },
        })
      : await tx.tarpitEntry.create({
          data: {
            ip: input.ip,
            detectedAt: at,
            duration,
            durationMinutes: input.durationMinutes,
            expiresAt,
            addressList: input.addressList,
            status: input.status,
            detectionId: input.detectionId ?? null,
          },
        });

    await tx.auditEntry.create({
      data: {
        timestamp: at,
        administrator: input.actor.administrator,
        administratorId: input.actor.administratorId ?? null,
        previousMode: current?.status ?? "none",
        newMode: input.status,
        action: "tarpit_apply",
        target: input.ip,
        reason: input.detail ?? input.reason ?? null,
      },
    });

    if (input.detectionId) {
      await tx.detection.update({
        where: { id: input.detectionId },
        data: {
          action: "TARPIT",
          status: input.status === "Active" ? "Active" : "Review",
        },
      });
    }

    return { entry: toTarpit(saved), created: true };
  });
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

import { ALLOWED_DURATIONS, assertIntInRange, assertOneOf, isNonEmptyString } from "@/lib/validation";
import type { MitigationMode, MitigationPolicy } from "@/types/security";

const MODES = ["Automatic", "Manual"] as const;

/** Safety envelope for the 32 MB / 1-core target router. */
export const POLICY_BOUNDS = {
  confidenceThreshold: { min: 60, max: 99 },
  maxDurationMinutes: { min: 15, max: 720 },
  maxActiveEntries: { min: 10, max: 100 },
} as const;

/**
 * Validate an untrusted policy payload. Every field is bounded: the policy is
 * a safety envelope, never an optimisation knob, and there is no "unlimited".
 */
export function parsePolicyPayload(input: unknown): MitigationPolicy {
  if (typeof input !== "object" || input === null) {
    throw new Error("Payload kebijakan harus berupa objek.");
  }
  const raw = input as Record<string, unknown>;

  const mode = assertOneOf<MitigationMode>(raw.mode, MODES, "mode");

  const confidenceThreshold = assertIntInRange(raw.confidenceThreshold, {
    ...POLICY_BOUNDS.confidenceThreshold,
    label: "Ambang keyakinan",
  });

  const durationMinutes = assertIntInRange(raw.durationMinutes, {
    min: 15,
    max: 360,
    label: "Durasi tarpit",
  });
  if (!(ALLOWED_DURATIONS as readonly number[]).includes(durationMinutes)) {
    throw new Error(`Durasi tarpit harus salah satu dari: ${ALLOWED_DURATIONS.join(", ")} menit.`);
  }

  const maxDurationMinutes = assertIntInRange(raw.maxDurationMinutes, {
    ...POLICY_BOUNDS.maxDurationMinutes,
    label: "Durasi maksimum",
  });
  if (maxDurationMinutes < durationMinutes) {
    throw new Error("Durasi maksimum tidak boleh lebih kecil dari durasi tarpit.");
  }

  const maxActiveEntries = assertIntInRange(raw.maxActiveEntries, {
    ...POLICY_BOUNDS.maxActiveEntries,
    label: "Maksimum entry aktif",
  });

  if (!isNonEmptyString(raw.addressList)) {
    throw new Error("Nama address-list wajib diisi.");
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(raw.addressList)) {
    throw new Error("Nama address-list hanya boleh huruf, angka, tanda hubung, dan garis bawah.");
  }

  return {
    mode,
    confidenceThreshold,
    durationMinutes,
    maxDurationMinutes,
    maxActiveEntries,
    addressList: raw.addressList,
  };
}

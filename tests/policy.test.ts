import { describe, expect, it } from "vitest";

import { ALLOWED_DURATIONS } from "@/lib/policy-options";
import { parsePolicyPayload, POLICY_BOUNDS } from "@/lib/policy";

function valid(overrides: Record<string, unknown> = {}) {
  return {
    mode: "Automatic",
    confidenceThreshold: 85,
    durationMinutes: 60,
    maxDurationMinutes: 360,
    maxActiveEntries: 50,
    addressList: "reconshield-tarpit-active",
    ...overrides,
  };
}

describe("parsePolicyPayload", () => {
  it("accepts a valid policy and returns normalised fields", () => {
    expect(parsePolicyPayload(valid())).toEqual({
      mode: "Automatic",
      confidenceThreshold: 85,
      durationMinutes: 60,
      maxDurationMinutes: 360,
      maxActiveEntries: 50,
      addressList: "reconshield-tarpit-active",
    });
  });

  it("accepts every allowed duration", () => {
    for (const durationMinutes of ALLOWED_DURATIONS) {
      expect(() => parsePolicyPayload(valid({ durationMinutes }))).not.toThrow();
    }
  });

  it("rejects a duration outside the allow-list, even inside the numeric range", () => {
    // 90 is within 15-360 but is not one of the permitted presets.
    expect(() => parsePolicyPayload(valid({ durationMinutes: 90 }))).toThrow(/salah satu dari/);
    // 720 exceeds the hard duration ceiling, so the range check fires first.
    expect(() => parsePolicyPayload(valid({ durationMinutes: 720 }))).toThrow(/antara 15 dan 360/);
  });

  it("rejects confidence thresholds outside 60-99", () => {
    expect(() => parsePolicyPayload(valid({ confidenceThreshold: 59 }))).toThrow(/60 dan 99/);
    expect(() => parsePolicyPayload(valid({ confidenceThreshold: 100 }))).toThrow(/60 dan 99/);
    expect(() => parsePolicyPayload(valid({ confidenceThreshold: 85.5 }))).toThrow(/bilangan bulat/);
  });

  it("rejects a maximum duration below the chosen duration", () => {
    expect(() => parsePolicyPayload(valid({ durationMinutes: 240, maxDurationMinutes: 60 }))).toThrow(
      /tidak boleh lebih kecil/,
    );
  });

  it("rejects more than 100 active entries (no unlimited setting)", () => {
    expect(() => parsePolicyPayload(valid({ maxActiveEntries: 101 }))).toThrow(/10 dan 100/);
    expect(() => parsePolicyPayload(valid({ maxActiveEntries: 9 }))).toThrow(/10 dan 100/);
  });

  it("rejects unsafe address-list names", () => {
    expect(() => parsePolicyPayload(valid({ addressList: "" }))).toThrow(/wajib diisi/);
    expect(() => parsePolicyPayload(valid({ addressList: "bad name!" }))).toThrow(/hanya boleh/);
    expect(() => parsePolicyPayload(valid({ addressList: "a".repeat(65) }))).toThrow(/hanya boleh/);
  });

  it("rejects an unknown mode and non-object payloads", () => {
    expect(() => parsePolicyPayload(valid({ mode: "Semi" }))).toThrow(/mode harus salah satu/);
    expect(() => parsePolicyPayload(null)).toThrow(/berupa objek/);
    expect(() => parsePolicyPayload("nope")).toThrow(/berupa objek/);
  });

  it("exposes bounds that match the documented safety envelope", () => {
    expect(POLICY_BOUNDS.confidenceThreshold).toEqual({ min: 60, max: 99 });
    expect(POLICY_BOUNDS.maxActiveEntries).toEqual({ min: 10, max: 100 });
    expect(POLICY_BOUNDS.maxDurationMinutes).toEqual({ min: 15, max: 720 });
  });
});

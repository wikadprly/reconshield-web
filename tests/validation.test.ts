import { describe, expect, it } from "vitest";

import { assertIntInRange, assertOneOf, isIpAddress, isNonEmptyString } from "@/lib/validation";

describe("isIpAddress", () => {
  it("accepts valid IPv4 addresses", () => {
    expect(isIpAddress("10.10.24.118")).toBe(true);
    expect(isIpAddress("0.0.0.0")).toBe(true);
    expect(isIpAddress("255.255.255.255")).toBe(true);
  });

  it("rejects malformed or out-of-range addresses", () => {
    expect(isIpAddress("10.10.24")).toBe(false);
    expect(isIpAddress("10.10.24.256")).toBe(false);
    expect(isIpAddress("10.10.24.1.5")).toBe(false);
    expect(isIpAddress("")).toBe(false);
    expect(isIpAddress(42)).toBe(false);
  });
});

describe("assertIntInRange", () => {
  it("returns the value when inside the range", () => {
    expect(assertIntInRange(60, { min: 60, max: 99, label: "Ambang" })).toBe(60);
  });

  it("rejects numbers outside the range and non-integers", () => {
    expect(() => assertIntInRange(59, { min: 60, max: 99, label: "Ambang" })).toThrow(/antara 60 dan 99/);
    expect(() => assertIntInRange(1.5, { min: 1, max: 9, label: "N" })).toThrow(/bilangan bulat/);
    expect(() => assertIntInRange("85", { min: 60, max: 99, label: "Ambang" })).toThrow(/bilangan bulat/);
  });
});

describe("assertOneOf", () => {
  it("returns an allowed value and rejects anything else", () => {
    expect(assertOneOf("Manual", ["Automatic", "Manual"] as const, "mode")).toBe("Manual");
    expect(() => assertOneOf("Semi", ["Automatic", "Manual"] as const, "mode")).toThrow(/mode harus/);
  });
});

describe("isNonEmptyString", () => {
  it("treats whitespace as empty", () => {
    expect(isNonEmptyString("ada")).toBe(true);
    expect(isNonEmptyString("   ")).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { evaluateTarpitGuard, type TarpitGuardInput } from "@/lib/tarpit-guard";

function guard(overrides: Partial<TarpitGuardInput> = {}) {
  return evaluateTarpitGuard({
    mode: "Automatic",
    classification: "Reconnaissance",
    confidence: 95,
    confidenceThreshold: 85,
    activeCount: 0,
    maxActiveEntries: 50,
    ...overrides,
  });
}

describe("evaluateTarpitGuard", () => {
  it("allows an automatic recon detection above the threshold", () => {
    expect(guard()).toEqual({ allowed: true });
  });

  it("rejects anything that is not reconnaissance", () => {
    const result = guard({ classification: "Normal" });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toMatch(/bukan Reconnaissance/);
  });

  it("rejects an automatic detection below the confidence threshold", () => {
    const result = guard({ confidence: 70 });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toMatch(/di bawah ambang 85/);
  });

  it("requires approval in Manual mode", () => {
    const without = guard({ mode: "Manual" });
    expect(without.allowed).toBe(false);
    if (!without.allowed) expect(without.reason).toMatch(/persetujuan admin/);

    expect(guard({ mode: "Manual", viaApproval: true })).toEqual({ allowed: true });
  });

  it("lets an approved detection bypass the confidence threshold", () => {
    expect(guard({ confidence: 10, viaApproval: true })).toEqual({ allowed: true });
  });

  it("still enforces the active-entry cap for approved requests", () => {
    const result = guard({ viaApproval: true, activeCount: 50, maxActiveEntries: 50 });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toMatch(/Batas entri aktif/);
  });

  it("rejects when the active-entry cap is reached", () => {
    const result = guard({ activeCount: 50 });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toMatch(/50\/50/);
  });
});

import { describe, expect, it } from "vitest";

import { decideWorkerAction, type WorkerDecisionInput } from "@/lib/tarpit-worker-policy";

function decide(overrides: Partial<WorkerDecisionInput> = {}) {
  return decideWorkerAction({
    mode: "Automatic",
    classification: "Reconnaissance",
    confidence: 95,
    confidenceThreshold: 85,
    activeCount: 0,
    maxActiveEntries: 50,
    alreadyMitigated: false,
    hasExistingApproval: false,
    ...overrides,
  });
}

describe("decideWorkerAction", () => {
  it("applies the tarpit for an automatic recon detection above the threshold", () => {
    expect(decide()).toEqual({ action: "apply", reason: expect.stringMatching(/Automatic/) });
  });

  it("files an approval request in Manual mode", () => {
    expect(decide({ mode: "Manual" })).toEqual({
      action: "request-approval",
      reason: expect.stringMatching(/Manual/),
    });
  });

  it("lets Manual mode draft an approval even when the active cap is reached", () => {
    expect(decide({ mode: "Manual", activeCount: 50 }).action).toBe("request-approval");
  });

  it("ignores anything that is not reconnaissance", () => {
    expect(decide({ classification: "Normal" }).action).toBe("skip");
  });

  it("ignores a detection whose IP is already mitigated", () => {
    const result = decide({ alreadyMitigated: true });
    expect(result.action).toBe("skip");
    if (result.action === "skip") expect(result.reason).toMatch(/sudah berada dalam mitigasi/);
  });

  it("ignores a detection that already has an approval", () => {
    const result = decide({ hasExistingApproval: true });
    expect(result.action).toBe("skip");
    if (result.action === "skip") expect(result.reason).toMatch(/permintaan persetujuan/);
  });

  it("ignores a detection below the confidence threshold", () => {
    const result = decide({ confidence: 70 });
    expect(result.action).toBe("skip");
    if (result.action === "skip") expect(result.reason).toMatch(/di bawah ambang 85/);
  });

  it("stops automatic execution when the active-entry cap is reached", () => {
    const result = decide({ activeCount: 50, maxActiveEntries: 50 });
    expect(result.action).toBe("skip");
    if (result.action === "skip") expect(result.reason).toMatch(/50\/50/);
  });
});

import { describe, expect, it } from "vitest";

import { formatTimestamp, parseTimestamp, rankTopSources } from "@/lib/format";

describe("formatTimestamp", () => {
  it("passes already-formatted values through untouched", () => {
    expect(formatTimestamp("10 Mar 2026, 21:48")).toBe("10 Mar 2026, 21:48");
  });

  it("formats ISO strings and leaves unparseable input alone", () => {
    expect(formatTimestamp("2026-03-10T21:48:00.000Z")).toMatch(/2026/);
    expect(formatTimestamp("2026-99-99T00:00:00.000Z")).toBe("2026-99-99T00:00:00.000Z");
  });
});

describe("parseTimestamp", () => {
  it("returns a Date for valid input and null otherwise", () => {
    expect(parseTimestamp("2026-03-10T21:48:00.000Z")?.toISOString()).toBe("2026-03-10T21:48:00.000Z");
    expect(parseTimestamp("bukan tanggal")).toBeNull();
  });
});

describe("rankTopSources", () => {
  const rows = [
    { sourceIp: "10.0.0.2" },
    { sourceIp: "10.0.0.1" },
    { sourceIp: "10.0.0.2" },
    { sourceIp: "10.0.0.3" },
    { sourceIp: "10.0.0.2" },
    { sourceIp: "10.0.0.1" },
  ];

  it("counts per source, ordered by count then IP", () => {
    expect(rankTopSources(rows)).toEqual([
      { ip: "10.0.0.2", count: 3 },
      { ip: "10.0.0.1", count: 2 },
      { ip: "10.0.0.3", count: 1 },
    ]);
  });

  it("respects the limit", () => {
    expect(rankTopSources(rows, 1)).toEqual([{ ip: "10.0.0.2", count: 3 }]);
    expect(rankTopSources([], 5)).toEqual([]);
  });
});

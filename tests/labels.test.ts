import { describe, expect, it } from "vitest";

import { labelAction, labelClassification, labelFeature, labelMitigationMode, labelSource, labelStatus } from "@/lib/labels";

describe("UI labels", () => {
  it("translates stored values to Indonesian", () => {
    expect(labelStatus("Active")).toBe("Aktif");
    expect(labelStatus("Released")).toBe("Dilepas");
    expect(labelStatus("Pending")).toBe("Menunggu");
    expect(labelStatus("Expired")).toBe("Kedaluwarsa");
    expect(labelStatus("Verified")).toBe("Terverifikasi");
    expect(labelAction("Pending")).toBe("Tertunda");
    expect(labelAction("Blocked")).toBe("Diblokir");
    expect(labelMitigationMode("Automatic")).toBe("Otomatis");
  });

  it("keeps domain terms that must not be translated", () => {
    expect(labelClassification("Reconnaissance")).toBe("Reconnaissance");
    expect(labelAction("TARPIT")).toBe("TARPIT");
  });

  it("falls back to the raw value for unknown input", () => {
    expect(labelStatus("SomethingNew")).toBe("SomethingNew");
    expect(labelFeature("unknown_feature")).toBe("unknown_feature");
  });

  it("labels every data source honestly", () => {
    expect(labelSource("database")).toBe("Database");
    expect(labelSource("remote")).toBe("Layanan ML");
    expect(labelSource("mock")).toBe("Data pratinjau");
    expect(labelSource("mixed")).toBe("Campuran");
    expect(labelSource(undefined)).toBe("tidak tersedia");
  });

  it("maps all 16 evidence feature names", () => {
    const features = [
      "prot", "tos", "tcp_flags", "sport", "dport", "packets", "bytes", "duration_ms",
      "bytes_per_pkt", "pkts_per_sec", "f_fin", "f_syn", "f_rst", "f_psh", "f_ack", "f_urg",
    ];
    for (const feature of features) {
      expect(labelFeature(feature)).not.toBe(feature);
    }
  });
});

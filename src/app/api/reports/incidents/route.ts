import { buildIncidentReportPdf } from "@/services/report-service";
import { getMitigationPolicy, getSecurityOverview, getTarpitEntries, getRecentDetections } from "@/services/security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PERIODS: Record<string, { label: string; hours: number | null }> = {
  "24h": { label: "24 jam terakhir", hours: 24 },
  "7d": { label: "7 hari terakhir", hours: 24 * 7 },
  "30d": { label: "30 hari terakhir", hours: 24 * 30 },
  all: { label: "Seluruh data", hours: null },
};

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("period") ?? "7d";
  const period = PERIODS[key] ?? PERIODS["7d"]!;

  try {
    const [overviewResult, policyResult, detectionsResult, tarpitResult] = await Promise.all([
      getSecurityOverview(),
      getMitigationPolicy(),
      getRecentDetections(500),
      getTarpitEntries(),
    ]);

    // The window is relative to the newest record, matching the UI filter, so a
    // seeded dataset does not produce an empty report.
    const times = detectionsResult.data
      .map((row) => new Date(row.timestamp).getTime())
      .filter((time) => Number.isFinite(time));
    const reference = times.length > 0 ? Math.max(...times) : Date.now();
    const cutoff = period.hours === null ? null : reference - period.hours * 3_600_000;

    const detections = detectionsResult.data.filter((row) => {
      if (cutoff === null) return true;
      const time = new Date(row.timestamp).getTime();
      return !Number.isFinite(time) || time >= cutoff;
    });

    const pdf = await buildIncidentReportPdf({
      generatedAt: new Date(),
      overview: overviewResult.data,
      policy: policyResult.source === "database" ? policyResult.data : null,
      detections,
      tarpit: tarpitResult.data,
      periodLabel: period.label,
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="laporan-insiden-reconshield-${key}-${new Date().toISOString().slice(0, 10)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[api] report generation failed:", error);
    return Response.json({ error: "Gagal membuat laporan PDF." }, { status: 503 });
  }
}

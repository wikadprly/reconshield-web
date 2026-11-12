import { getTrafficSeries } from "@/services/security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RANGES = ["1h", "24h", "7d"] as const;
type Range = (typeof RANGES)[number];

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("range");
  const range: Range = raw && (RANGES as readonly string[]).includes(raw) ? (raw as Range) : "24h";

  try {
    return Response.json(await getTrafficSeries(range));
  } catch (error) {
    console.error("[api] traffic series failed:", error);
    return Response.json({ error: "Data tren trafik tidak tersedia." }, { status: 503 });
  }
}

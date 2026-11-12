import { getEvidence } from "@/services/security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ detectionId: string }> }) {
  try {
    const { detectionId } = await params;
    return Response.json(await getEvidence(detectionId));
  } catch (error) {
    console.error("[api] evidence read failed:", error);
    return Response.json({ error: "Bukti klasifikasi tidak tersedia." }, { status: 503 });
  }
}

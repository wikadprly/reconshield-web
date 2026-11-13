import { serviceError } from "@/lib/api-route";
import { applyTarpitForDetection, getTarpitEntries } from "@/services/security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(await getTarpitEntries());
  } catch (error) {
    return serviceError(error);
  }
}

/**
 * Apply the Dynamic Tarpit to a detection (write path A4). Guardrails and the
 * RouterOS address-list write run in the service; the response says whether the
 * router confirmed the change or the entry is only pending.
 */
export async function POST(request: Request) {
  let body: { detectionId?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body harus berupa JSON yang valid." }, { status: 400 });
  }

  if (typeof body.detectionId !== "string" || body.detectionId.trim() === "") {
    return Response.json({ error: "detectionId wajib diisi." }, { status: 400 });
  }

  try {
    const outcome = await applyTarpitForDetection({
      detectionId: body.detectionId.trim(),
      reason: typeof body.reason === "string" ? body.reason.slice(0, 200) : undefined,
    });
    return Response.json({ data: outcome.entry, applied: outcome.applied, detail: outcome.detail });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal menerapkan tarpit." }, { status: 400 });
  }
}

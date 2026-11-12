import { getMitigationPolicy, updateMitigationPolicy } from "@/services/security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(await getMitigationPolicy());
  } catch (error) {
    console.error("[api] policy read failed:", error);
    return Response.json({ error: "Kebijakan mitigasi tidak tersedia." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Body harus berupa JSON yang valid." }, { status: 400 });
  }

  try {
    const policy = await updateMitigationPolicy(payload);
    return Response.json({ data: policy });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kebijakan tidak valid.";
    console.error("[api] policy write failed:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}

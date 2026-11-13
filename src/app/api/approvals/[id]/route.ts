import { decideApprovalRequest } from "@/services/security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let body: { decision?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body harus berupa JSON yang valid." }, { status: 400 });
  }

  if (body.decision !== "approved" && body.decision !== "rejected") {
    return Response.json({ error: "Keputusan harus 'approved' atau 'rejected'." }, { status: 400 });
  }

  try {
    const { id } = await params;
    const outcome = await decideApprovalRequest(
      id,
      body.decision,
      typeof body.reason === "string" ? body.reason.slice(0, 200) : undefined,
    );
    return Response.json({
      data: outcome.approval,
      mitigation: outcome.mitigation,
      mitigationError: outcome.mitigationError,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal memutuskan persetujuan." }, { status: 400 });
  }
}

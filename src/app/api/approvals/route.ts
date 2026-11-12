import { readLimit, serviceError } from "@/lib/api-route";
import { getApprovals, requestApproval } from "@/services/security-service";
import type { ApprovalStatus } from "@/types/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES: ApprovalStatus[] = ["pending", "approved", "rejected", "cancelled"];

function parseStatus(url: string): ApprovalStatus | undefined {
  const raw = new URL(url).searchParams.get("status");
  return raw && (STATUSES as string[]).includes(raw) ? (raw as ApprovalStatus) : undefined;
}

export async function GET(request: Request) {
  try {
    return Response.json(await getApprovals(parseStatus(request.url)));
  } catch (error) {
    return serviceError(error);
  }
}

export async function POST(request: Request) {
  let body: { detectionId?: unknown; proposedAction?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body harus berupa JSON yang valid." }, { status: 400 });
  }

  try {
    const approval = await requestApproval({
      detectionId: String(body.detectionId ?? ""),
      proposedAction: String(body.proposedAction ?? ""),
      reason: typeof body.reason === "string" ? body.reason.slice(0, 200) : undefined,
    });
    return Response.json({ data: approval }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal membuat persetujuan." }, { status: 400 });
  }
}

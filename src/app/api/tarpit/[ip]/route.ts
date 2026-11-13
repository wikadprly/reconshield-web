import { releaseTarpitIp, verifyTarpitIp } from "@/services/security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Release one IP: remove it from the RouterOS address-list, then mark it Released. */
export async function DELETE(request: Request, { params }: { params: Promise<{ ip: string }> }) {
  let reason: string | undefined;
  try {
    const body = await request.json();
    if (typeof body?.reason === "string") reason = body.reason.slice(0, 200);
  } catch {
    reason = undefined;
  }

  try {
    const { ip } = await params;
    const outcome = await releaseTarpitIp(decodeURIComponent(ip), reason);
    return Response.json({ data: outcome.entry, routerRemoved: outcome.routerRemoved, detail: outcome.detail });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal melepas IP." }, { status: 400 });
  }
}

/** Read-only verification against the RouterOS address-list. */
export async function POST(request: Request, { params }: { params: Promise<{ ip: string }> }) {
  try {
    const { ip } = await params;
    return Response.json({ data: await verifyTarpitIp(decodeURIComponent(ip)) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal memverifikasi IP." }, { status: 400 });
  }
}

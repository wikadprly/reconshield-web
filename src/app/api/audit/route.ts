import { readLimit, serviceError } from "@/lib/api-route";
import { getAuditEntries } from "@/services/security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    return Response.json(await getAuditEntries(readLimit(request.url, 50)));
  } catch (error) {
    return serviceError(error);
  }
}

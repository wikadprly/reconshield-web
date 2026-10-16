import { serviceError } from "@/lib/api-route";
import { getSecurityOverview } from "@/services/security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(await getSecurityOverview());
  } catch (error) {
    return serviceError(error);
  }
}

import { serviceError } from "@/lib/api-route";
import { getServiceStatuses } from "@/services/security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(await getServiceStatuses());
  } catch (error) {
    return serviceError(error);
  }
}

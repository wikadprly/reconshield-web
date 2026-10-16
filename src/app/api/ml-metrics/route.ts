import { serviceError } from "@/lib/api-route";
import { getMlMetrics } from "@/services/security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(await getMlMetrics());
  } catch (error) {
    return serviceError(error);
  }
}

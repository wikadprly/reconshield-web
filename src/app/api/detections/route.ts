import { readLimit, serviceError } from "@/lib/api-route";
import { getRecentDetections } from "@/services/security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    return Response.json(await getRecentDetections(readLimit(request.url, 100)));
  } catch (error) {
    return serviceError(error);
  }
}

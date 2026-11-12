import { readLimit, serviceError } from "@/lib/api-route";
import { getRouterResourceHistory } from "@/services/security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    return Response.json(await getRouterResourceHistory(readLimit(request.url, 120, 600)));
  } catch (error) {
    return serviceError(error);
  }
}

import { serviceError } from "@/lib/api-route";
import { readLimit } from "@/lib/api-route";
import { getRouterResourceHistory } from "@/services/security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const limit = readLimit(request.url, 120, 600);
    return Response.json(await getRouterResourceHistory(limit));
  } catch (error) {
    return serviceError(error);
  }
}

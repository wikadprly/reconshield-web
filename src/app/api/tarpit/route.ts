import { serviceError } from "@/lib/api-route";
import { getTarpitEntries } from "@/services/security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(await getTarpitEntries());
  } catch (error) {
    return serviceError(error);
  }
}

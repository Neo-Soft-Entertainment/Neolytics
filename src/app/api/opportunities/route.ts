import { ok } from "@/lib/api-response";
import { getOpportunityFinderData } from "@/lib/game-service";

export async function GET() {
  return ok(await getOpportunityFinderData());
}

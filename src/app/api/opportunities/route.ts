import { ok, tooManyRequests } from "@/lib/api-response";
import { AuthRateLimitError, assertPublicApiRateLimit, getPublicApiRateLimitKey } from "@/lib/auth-rate-limit";
import { getOpportunityFinderData } from "@/lib/game-service";

export async function GET(request: Request) {
  try {
    await assertPublicApiRateLimit(getPublicApiRateLimitKey(request, "opportunities"));
    return ok(await getOpportunityFinderData());
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return tooManyRequests(error.message);
    }

    throw error;
  }
}

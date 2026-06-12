import { ok, tooManyRequests, unauthorized } from "@/lib/api-response";
import { AuthRateLimitError, assertPublicApiRateLimit, getPublicApiRateLimitKey } from "@/lib/auth-rate-limit";
import { getApiContext } from "@/lib/auth-helpers";
import { EntitlementError, assertCanUseFeature, entitlementErrorResponse } from "@/lib/entitlements";
import { getOpportunityFinderData } from "@/lib/game-service";

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    await assertPublicApiRateLimit(getPublicApiRateLimitKey(request, "opportunities"));
    const context = await getApiContext();

    if (!context) {
      return unauthorized();
    }

    await assertCanUseFeature({
      userId: context.userId,
      workspaceId: context.workspace.id,
      organizationId: context.organizationId
    }, "marketResearch");

    return ok(await getOpportunityFinderData());
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return tooManyRequests(error.message);
    }

    if (error instanceof EntitlementError) {
      return entitlementErrorResponse(error);
    }

    throw error;
  }
}

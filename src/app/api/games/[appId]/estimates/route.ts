import { z } from "zod";

import { badRequest, ok, serverError, tooManyRequests, unauthorized } from "@/lib/api-response";
import { AuthRateLimitError, assertPublicApiRateLimit, getPublicApiRateLimitKey } from "@/lib/auth-rate-limit";
import { getApiContext } from "@/lib/auth-helpers";
import { EntitlementError, assertCanUseFeature, entitlementErrorResponse } from "@/lib/entitlements";
import { getLatestEstimates } from "@/lib/game-service";

const schema = z.coerce.number().int().positive();

export const maxDuration = 60;

export async function GET(request: Request, { params }: { params: Promise<{ appId: string }> }) {
  try {
    await assertPublicApiRateLimit(getPublicApiRateLimitKey(request, "game-estimates"));
    const context = await getApiContext();

    if (!context) {
      return unauthorized();
    }

    await assertCanUseFeature({
      userId: context.userId,
      workspaceId: context.workspace.id,
      organizationId: context.organizationId
    }, "revenueCalculator");

    const { appId } = await params;
    return ok(await getLatestEstimates(schema.parse(appId)));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Invalid app id.");
    }

    if (error instanceof AuthRateLimitError) {
      return tooManyRequests(error.message);
    }

    if (error instanceof EntitlementError) {
      return entitlementErrorResponse(error);
    }

    return serverError();
  }
}

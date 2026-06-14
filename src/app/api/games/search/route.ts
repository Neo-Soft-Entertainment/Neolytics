import { z } from "zod";

import { badRequest, ok, serverError, tooManyRequests, unauthorized } from "@/lib/api-response";
import { AuthRateLimitError, assertPublicApiRateLimit, getPublicApiRateLimitKey } from "@/lib/auth-rate-limit";
import { getApiContext } from "@/lib/auth-helpers";
import { EntitlementError, assertCanUseFeature, entitlementErrorResponse } from "@/lib/entitlements";
import { searchGames } from "@/lib/game-service";
import { parseSearchParams } from "@/lib/request";

const schema = z.object({
  query: z.string().trim().min(1).max(120).optional(),
  genre: z.string().trim().min(1).max(64).regex(/^[a-z0-9-]+$/).optional(),
  tag: z.string().trim().min(1).max(64).regex(/^[a-z0-9-]+$/).optional(),
  minPrice: z.coerce.number().int().min(0).max(1_000_000).optional(),
  maxPrice: z.coerce.number().int().min(0).max(1_000_000).optional(),
  minReviewScore: z.coerce.number().min(0).max(100).optional(),
  fromReleaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toReleaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().max(1_000).optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional()
});

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    await assertPublicApiRateLimit(getPublicApiRateLimitKey(request, "games-search"));
    const context = await getApiContext();

    if (!context) {
      return unauthorized();
    }

    await assertCanUseFeature({
      userId: context.userId,
      workspaceId: context.workspace.id,
      organizationId: context.organizationId
    }, "radarSteam");

    const parsed = parseSearchParams(new URL(request.url), schema);
        let resolvedValue0: any;
    if (parsed.fromReleaseDate) {
      resolvedValue0 = new Date(parsed.fromReleaseDate);
    } else {
      resolvedValue0 = undefined;
    }
    let resolvedValue1: any;
    if (parsed.toReleaseDate) {
      resolvedValue1 = new Date(parsed.toReleaseDate);
    } else {
      resolvedValue1 = undefined;
    }
const result = await searchGames({
      ...parsed,
      fromReleaseDate: resolvedValue0,
      toReleaseDate: resolvedValue1
    });

    return ok(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid search parameters.");
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

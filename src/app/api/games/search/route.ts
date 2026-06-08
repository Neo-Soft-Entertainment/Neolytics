import { z } from "zod";

import { badRequest, ok, serverError, tooManyRequests, unauthorized } from "@/lib/api-response";
import { AuthRateLimitError, assertPublicApiRateLimit, getPublicApiRateLimitKey } from "@/lib/auth-rate-limit";
import { getApiContext } from "@/lib/auth-helpers";
import { EntitlementError, assertCanUseFeature, entitlementErrorResponse } from "@/lib/entitlements";
import { searchGames } from "@/lib/game-service";
import { parseSearchParams } from "@/lib/request";

const schema = z.object({
  query: z.string().optional(),
  genre: z.string().optional(),
  tag: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minReviewScore: z.coerce.number().optional(),
  fromReleaseDate: z.string().optional(),
  toReleaseDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional()
});

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
    const result = await searchGames({
      ...parsed,
      fromReleaseDate: parsed.fromReleaseDate ? new Date(parsed.fromReleaseDate) : undefined,
      toReleaseDate: parsed.toReleaseDate ? new Date(parsed.toReleaseDate) : undefined
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

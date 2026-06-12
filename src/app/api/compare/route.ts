import { z } from "zod";

import { badRequest, ok, serverError, tooManyRequests } from "@/lib/api-response";
import { AuthRateLimitError, assertPublicApiRateLimit, getPublicApiRateLimitKey } from "@/lib/auth-rate-limit";
import { compareGames } from "@/lib/game-service";
import { parseSearchParams } from "@/lib/request";

const schema = z.object({
  appIds: z.string().trim().min(1).max(120).regex(/^\d+(?:\s*,\s*\d+){0,9}$/)
});

export async function GET(request: Request) {
  try {
    await assertPublicApiRateLimit(getPublicApiRateLimitKey(request, "compare"));

    const parsed = parseSearchParams(new URL(request.url), schema);
    const appIds = parsed.appIds
      .split(",")
      .map((value: string) => Number(value.trim()))
      .filter((value: number) => Number.isInteger(value) && value > 0);

    if (appIds.length < 2) {
      return badRequest("Compare at least 2 games.");
    }

    if (appIds.length > 10) {
      return badRequest("Compare up to 10 games at a time.");
    }

    return ok(await compareGames(appIds));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Invalid appIds value.");
    }

    if (error instanceof AuthRateLimitError) {
      return tooManyRequests(error.message);
    }

    return serverError();
  }
}

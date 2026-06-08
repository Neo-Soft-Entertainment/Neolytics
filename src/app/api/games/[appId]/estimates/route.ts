import { z } from "zod";

import { badRequest, ok, serverError, tooManyRequests } from "@/lib/api-response";
import { AuthRateLimitError, assertPublicApiRateLimit, getPublicApiRateLimitKey } from "@/lib/auth-rate-limit";
import { getLatestEstimates } from "@/lib/game-service";

const schema = z.coerce.number().int().positive();

export async function GET(request: Request, { params }: { params: Promise<{ appId: string }> }) {
  try {
    await assertPublicApiRateLimit(getPublicApiRateLimitKey(request, "game-estimates"));

    const { appId } = await params;
    return ok(await getLatestEstimates(schema.parse(appId)));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Invalid app id.");
    }

    if (error instanceof AuthRateLimitError) {
      return tooManyRequests(error.message);
    }

    return serverError();
  }
}

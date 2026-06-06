import { z } from "zod";

import { badRequest, ok, serverError } from "@/lib/api-response";
import { compareGames } from "@/lib/game-service";
import { parseSearchParams } from "@/lib/request";

const schema = z.object({
  appIds: z.string().min(1)
});

export async function GET(request: Request) {
  try {
    const parsed = parseSearchParams(new URL(request.url), schema);
    const appIds = parsed.appIds
      .split(",")
      .map((value: string) => Number(value.trim()))
      .filter((value: number) => Number.isInteger(value) && value > 0);

    return ok(await compareGames(appIds));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Invalid appIds value.");
    }

    return serverError();
  }
}

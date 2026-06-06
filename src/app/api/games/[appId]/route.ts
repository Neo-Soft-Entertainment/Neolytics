import { z } from "zod";

import { badRequest, notFound, ok, serverError } from "@/lib/api-response";
import { getGameByAppId } from "@/lib/game-service";

const schema = z.coerce.number().int().positive();

export async function GET(_: Request, { params }: { params: Promise<{ appId: string }> }) {
  try {
    const { appId } = await params;
    const parsedAppId = schema.parse(appId);
    const game = await getGameByAppId(parsedAppId);

    if (!game) {
      return notFound("Game not found.");
    }

    return ok(game);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Invalid app id.");
    }

    return serverError();
  }
}

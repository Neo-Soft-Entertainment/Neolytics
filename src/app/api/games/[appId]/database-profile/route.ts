import { z } from "zod";

import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { getSteamDatabaseProfile } from "@/lib/game-service";

const schema = z.coerce.number().int().positive();

export const maxDuration = 60;

export async function GET(_: Request, { params }: { params: Promise<{ appId: string }> }) {
  try {
    const context = await getApiContext();

    if (!context) {
      return unauthorized();
    }

    const { appId } = await params;
    return ok(await getSteamDatabaseProfile(schema.parse(appId)));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Invalid app id.");
    }

    return serverError();
  }
}

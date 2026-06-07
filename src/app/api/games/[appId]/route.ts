import { SubscriptionPlan } from "@prisma/client";
import { z } from "zod";

import { badRequest, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { getGameByAppId, getSteamXrayAccess } from "@/lib/game-service";

const schema = z.coerce.number().int().positive();

export async function GET(_: Request, { params }: { params: Promise<{ appId: string }> }) {
  try {
    const context = await getApiContext();

    if (!context) {
      return unauthorized();
    }

    const { appId } = await params;
    const parsedAppId = schema.parse(appId);
    const game = await getGameByAppId(parsedAppId);

    if (!game) {
      return notFound("Game not found.");
    }

    return ok({
      ...game,
      steamXrayAccess: getSteamXrayAccess(context.session.user.organizations.find((organization) => organization.id === context.organizationId)?.subscriptionPlan ?? SubscriptionPlan.FREE)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Invalid app id.");
    }

    return serverError();
  }
}

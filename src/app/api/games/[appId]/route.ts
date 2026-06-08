import { SubscriptionPlan } from "@prisma/client";
import { z } from "zod";

import { badRequest, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import {
  EntitlementError,
  assertCanUseFeature,
  assertCurrentUsageWithinLimit,
  entitlementErrorResponse,
  recordUsage
} from "@/lib/entitlements";
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
    const entitlementContext = {
      userId: context.userId,
      workspaceId: context.workspace.id,
      organizationId: context.organizationId
    };

    await assertCanUseFeature(entitlementContext, "steamXray");
    await assertCurrentUsageWithinLimit(entitlementContext, "steamXrayPerMonth");

    const game = await getGameByAppId(parsedAppId);

    if (!game) {
      return notFound("Game not found.");
    }

    await recordUsage(entitlementContext, {
      featureKey: "steamXray",
      limitKey: "steamXrayPerMonth",
      metadata: {
        appId: parsedAppId
      }
    });

    return ok({
      ...game,
      steamXrayAccess: getSteamXrayAccess(context.session.user.organizations.find((organization) => organization.id === context.organizationId)?.subscriptionPlan ?? SubscriptionPlan.FREE)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Invalid app id.");
    }

    if (error instanceof EntitlementError) {
      return entitlementErrorResponse(error);
    }

    return serverError();
  }
}

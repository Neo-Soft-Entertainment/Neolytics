import { SubscriptionPlan } from "@prisma/client";
import { z } from "zod";

import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { EntitlementError, assertCanUseFeature, entitlementErrorResponse } from "@/lib/entitlements";
import { getReviewHistory, getSteamXrayAccess } from "@/lib/game-service";

const schema = z.coerce.number().int().positive();

export async function GET(_: Request, { params }: { params: Promise<{ appId: string }> }) {
  try {
    const context = await getApiContext();

    if (!context) {
      return unauthorized();
    }

    const { appId } = await params;
    const plan = context.session.user.organizations.find((organization) => organization.id === context.organizationId)?.subscriptionPlan ?? SubscriptionPlan.FREE;
    await assertCanUseFeature({
      userId: context.userId,
      workspaceId: context.workspace.id,
      organizationId: context.organizationId
    }, "steamXray");
    return ok(await getReviewHistory(schema.parse(appId), getSteamXrayAccess(plan).historyLimit));
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

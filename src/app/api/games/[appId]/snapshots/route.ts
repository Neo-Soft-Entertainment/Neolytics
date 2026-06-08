import { SubscriptionPlan } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { EntitlementError, assertCanUseFeature, entitlementErrorResponse } from "@/lib/entitlements";
import { getGameSnapshots, getSteamXrayAccess } from "@/lib/game-service";

const schema = z.coerce.number().int().positive();

export async function GET(_: Request, { params }: { params: Promise<{ appId: string }> }) {
  try {
    const context = await getApiContext();

    if (!context) {
      return unauthorized();
    }

    const plan = context.session.user.organizations.find((organization) => organization.id === context.organizationId)?.subscriptionPlan ?? SubscriptionPlan.FREE;
    const access = getSteamXrayAccess(plan);
    await assertCanUseFeature({
      userId: context.userId,
      workspaceId: context.workspace.id,
      organizationId: context.organizationId
    }, "earlyAccess");

    if (!access.rawSnapshotsBetaAvailable) {
      return forbidden("Seu acesso atual não inclui este recurso.");
    }

    const { appId } = await params;
    return ok(await getGameSnapshots(schema.parse(appId), access.historyLimit));
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

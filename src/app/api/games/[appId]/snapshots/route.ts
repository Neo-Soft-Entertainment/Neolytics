import { SubscriptionPlan } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
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

    if (!access.rawSnapshotsBetaAvailable) {
      return forbidden("Raw snapshot stream beta is available on Pro.");
    }

    const { appId } = await params;
    return ok(await getGameSnapshots(schema.parse(appId), access.historyLimit));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Invalid app id.");
    }

    return serverError();
  }
}

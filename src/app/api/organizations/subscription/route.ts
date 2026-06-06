import { OrganizationRole, SubscriptionPlan } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { getOrganizationSubscriptionSnapshot, updateOrganizationSubscriptionPlan } from "@/lib/subscription-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  plan: z.nativeEnum(SubscriptionPlan)
});

export async function PATCH(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (context.organizationRole !== OrganizationRole.OWNER && context.organizationRole !== OrganizationRole.ADMIN) {
    return forbidden("Only organization admins can change the subscription plan.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    await updateOrganizationSubscriptionPlan(context.organizationId, body.plan);

    return ok(await getOrganizationSubscriptionSnapshot(context.organizationId));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid subscription payload.");
    }

    return serverError("Unable to update subscription plan.");
  }
}

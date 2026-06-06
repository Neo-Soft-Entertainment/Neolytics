import { OrganizationRole, SubscriptionPlan } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { parseJsonBody } from "@/lib/request";
import { createStripeCheckoutSession } from "@/lib/stripe";

const schema = z.object({
  plan: z.nativeEnum(SubscriptionPlan)
});

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (context.organizationRole !== OrganizationRole.OWNER && context.organizationRole !== OrganizationRole.ADMIN) {
    return forbidden("Only organization admins can change the subscription plan.");
  }

  try {
    const body = await parseJsonBody(request, schema);

    if (body.plan === SubscriptionPlan.FREE) {
      return badRequest("Free does not require Stripe Checkout.");
    }

    const organization = context.session.user.organizations.find(
      (candidate) => candidate.id === context.organizationId
    );

    if (organization?.subscriptionPlan !== SubscriptionPlan.FREE) {
      return badRequest("Plan swaps for active paid subscriptions are the next billing step.");
    }

    const session = await createStripeCheckoutSession({
      organizationId: context.organizationId,
      organizationName: organization?.name ?? "Organization",
      userEmail: context.session.user.email ?? "",
      plan: body.plan
    });

    return ok({ url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid checkout payload.");
    }

    return badRequest(error instanceof Error ? error.message : "Unable to start Stripe checkout.");
  }
}

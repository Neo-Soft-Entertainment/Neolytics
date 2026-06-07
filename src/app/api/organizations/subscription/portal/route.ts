import { OrganizationRole } from "@prisma/client";

import { forbidden, ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { createStripeBillingPortalSession } from "@/lib/stripe";

export async function POST() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (context.organizationRole !== OrganizationRole.OWNER && context.organizationRole !== OrganizationRole.ADMIN) {
    return forbidden("Only organization admins can manage billing.");
  }

  try {
    const session = await createStripeBillingPortalSession({
      organizationId: context.organizationId
    });

    return ok({ url: session.url });
  } catch (error) {
    return new Response(
      JSON.stringify({
        message: error instanceof Error ? error.message : "Unable to open Stripe billing portal."
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}

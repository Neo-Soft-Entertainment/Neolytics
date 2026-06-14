import { OrganizationRole } from "@prisma/client";

import { forbidden, ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { createStripeBillingPortalSession } from "@/lib/stripe";
import { getErrorMessage } from "@/lib/error-message";

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
        message: getErrorMessage(error, "Não foi possível abrir o portal de cobrança da Stripe.")
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

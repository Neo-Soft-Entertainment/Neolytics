import { OrganizationRole } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { createOrganizationInvitation, OrganizationInvitationError, SubscriptionLimitError } from "@/lib/organization-invitation-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(OrganizationRole).default(OrganizationRole.MEMBER)
});

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (context.organizationRole !== OrganizationRole.OWNER && context.organizationRole !== OrganizationRole.ADMIN) {
    return forbidden("Only organization admins can invite members.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const invitation = await createOrganizationInvitation({
      organizationId: context.organizationId,
      invitedById: context.userId,
      email: body.email,
      role: body.role
    });

    return ok(invitation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid invitation payload.");
    }

    if (error instanceof OrganizationInvitationError || error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    return serverError("Unable to create invitation.");
  }
}

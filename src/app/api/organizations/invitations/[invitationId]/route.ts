import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { canManageOrganization } from "@/lib/authorization";
import { getApiContext } from "@/lib/auth-helpers";
import { revokeOrganizationInvitation, OrganizationInvitationError } from "@/lib/organization-invitation-service";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only organization admins can revoke invitations.");
  }

  try {
    const { invitationId } = await params;
    const invitation = await revokeOrganizationInvitation({
      invitationId,
      organizationId: context.organizationId
    });

    return ok(invitation);
  } catch (error) {
    if (error instanceof OrganizationInvitationError) {
      return badRequest(error.message);
    }

    return serverError("Não foi possível revogar o convite.");
  }
}

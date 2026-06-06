import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { requireApiUser } from "@/lib/auth-helpers";
import { acceptOrganizationInvitation, OrganizationInvitationError } from "@/lib/organization-invitation-service";
import { parseJsonBody } from "@/lib/request";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(10)
});

export async function POST(request: Request) {
  const session = await requireApiUser();

  if (!session?.user?.id || !session.user.email) {
    return unauthorized();
  }

  try {
    const body = await parseJsonBody(request, schema);
    const invitation = await acceptOrganizationInvitation({
      token: body.token,
      userId: session.user.id,
      userEmail: session.user.email
    });

    return ok(invitation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid invitation token.");
    }

    if (error instanceof OrganizationInvitationError) {
      return badRequest(error.message);
    }

    return serverError("Unable to accept invitation.");
  }
}

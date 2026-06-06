import { hash } from "bcryptjs";
import { z } from "zod";

import { badRequest, ok, serverError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { acceptOrganizationInvitation, getOrganizationInvitationByToken, OrganizationInvitationError } from "@/lib/organization-invitation-service";
import { createOrganizationForUser } from "@/lib/organization-service";
import { parseJsonBody } from "@/lib/request";

const optionalNonEmptyString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(2).optional());

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: optionalNonEmptyString,
  workspaceName: optionalNonEmptyString,
  inviteToken: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, schema);
    const email = body.email.trim().toLowerCase();
    const invitation = body.inviteToken
      ? await getOrganizationInvitationByToken(body.inviteToken)
      : null;

    if (body.inviteToken) {
      if (!invitation || invitation.revokedAt || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
        return badRequest("This invitation is no longer valid.");
      }

      if (invitation.email !== email) {
        return badRequest("Use the same invited email address to create this account.");
      }
    }

    if (!body.inviteToken && (!body.organizationName || !body.workspaceName)) {
      return badRequest("Organization name and workspace name are required.");
    }

    const existingUser = await db.user.findUnique({
      where: {
        email
      }
    });

    if (existingUser) {
      return badRequest("An account with this email already exists.");
    }

    const passwordHash = await hash(body.password, 12);
    const user = await db.user.create({
      data: {
        name: body.name.trim(),
        email,
        passwordHash
      }
    });

    if (body.inviteToken) {
      await acceptOrganizationInvitation({
        token: body.inviteToken,
        userId: user.id,
        userEmail: email
      });

      const workspace = await db.workspace.findFirst({
        where: {
          organizationId: invitation!.organizationId
        },
        orderBy: {
          createdAt: "asc"
        }
      });

      return ok({
        userId: user.id,
        organizationId: invitation!.organizationId,
        workspaceId: workspace?.id ?? null
      }, { status: 201 });
    }

    const organizationContext = await createOrganizationForUser({
      userId: user.id,
      organizationName: body.organizationName!,
      workspaceName: body.workspaceName
    });

    return ok({
      userId: user.id,
      organizationId: organizationContext.organization.id,
      workspaceId: organizationContext.workspace.id
    }, { status: 201 });
  } catch (error) {
    logger.error({ error }, "Signup failed");

    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid signup payload.");
    }

    if (error instanceof OrganizationInvitationError) {
      return badRequest(error.message);
    }

    return serverError("Unable to create account.");
  }
}

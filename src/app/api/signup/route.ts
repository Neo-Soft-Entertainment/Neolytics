import { SubscriptionPlan } from "@prisma/client";
import { z } from "zod";

import { badRequest, ok, serverError } from "@/lib/api-response";
import { setActiveOrganizationCookie } from "@/lib/active-organization";
import { AuthRateLimitError, assertAuthRateLimit, getSignupRateLimitKey, recordAuthAttempt } from "@/lib/auth-rate-limit";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { acceptOrganizationInvitation, getOrganizationInvitationByToken, OrganizationInvitationError } from "@/lib/organization-invitation-service";
import { hashPassword } from "@/lib/password";
import { createOrganizationForUser } from "@/lib/organization-service";
import { parseJsonBody } from "@/lib/request";
import { canUseStripeCheckout } from "@/lib/stripe";

const optionalNonEmptyString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().trim().min(2).max(80).optional());

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  organizationName: optionalNonEmptyString,
  workspaceName: optionalNonEmptyString,
  plan: z.nativeEnum(SubscriptionPlan).optional(),
  inviteToken: z.string().trim().min(20).max(255).optional()
});

export async function POST(request: Request) {
  const rateLimitKey = getSignupRateLimitKey(request);

  try {
    await assertAuthRateLimit(rateLimitKey);

    const body = await parseJsonBody(request, schema);
    const email = body.email.toLowerCase();
    const invitation = body.inviteToken
      ? await getOrganizationInvitationByToken(body.inviteToken)
      : null;

    if (body.inviteToken) {
      if (!invitation || invitation.revokedAt || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
        return badRequest("Este convite não é mais válido.");
      }

      if (invitation.email !== email) {
        return badRequest("Use the same invited email address to create this account.");
      }
    }

    if (!body.inviteToken && (!body.organizationName || !body.workspaceName)) {
      return badRequest("O nome da organização e o nome da área de trabalho são obrigatórios.");
    }

    if (body.inviteToken && body.plan && body.plan !== SubscriptionPlan.FREE) {
      return badRequest("Invited users cannot choose a paid plan during signup.");
    }

    const existingUser = await db.user.findUnique({
      where: {
        email
      }
    });

    if (existingUser) {
      await recordAuthAttempt(rateLimitKey, false);
      return badRequest("An account with this email already exists.");
    }

    const passwordHash = await hashPassword(body.password);
    const user = await db.user.create({
      data: {
        name: body.name,
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

      const response = ok({
        userId: user.id,
        organizationId: invitation!.organizationId,
        workspaceId: workspace?.id ?? null
      }, { status: 201 });
      setActiveOrganizationCookie(response, invitation!.organizationId);
      await recordAuthAttempt(rateLimitKey, true);
      return response;
    }

    const organizationContext = await createOrganizationForUser({
      userId: user.id,
      organizationName: body.organizationName!,
      workspaceName: body.workspaceName
    });

    const response = ok({
      userId: user.id,
      organizationId: organizationContext.organization.id,
      workspaceId: organizationContext.workspace.id,
      requiresCheckout: canUseStripeCheckout(body.plan ?? SubscriptionPlan.FREE)
    }, { status: 201 });
    setActiveOrganizationCookie(response, organizationContext.organization.id);
    await recordAuthAttempt(rateLimitKey, true);
    return response;
  } catch (error) {
    logger.error({ error }, "Signup failed");

    if (error instanceof AuthRateLimitError) {
      return badRequest(error.message);
    }

    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid signup payload.");
    }

    if (error instanceof OrganizationInvitationError) {
      return badRequest(error.message);
    }

    return serverError("Não foi possível criar a conta.");
  }
}

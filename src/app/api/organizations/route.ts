import { z } from "zod";

import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { createAuditEvent } from "@/lib/audit-service";
import { setActiveOrganizationCookie } from "@/lib/active-organization";
import { getApiContext, requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { createOrganizationForUser, deleteOrganizationForUser } from "@/lib/organization-service";
import { parseJsonBody } from "@/lib/request";

const createSchema = z.object({
  organizationName: z.string().min(2),
  workspaceName: z.string().min(2),
  defaultLanguage: z.string().min(2).max(16),
  countryCode: z.string().length(2)
});

const updateDefaultsSchema = z.object({
  defaultLanguage: z.string().min(2).max(16),
  countryCode: z.string().length(2)
});

export async function POST(request: Request) {
  const session = await requireApiUser();

  if (!session?.user?.id) {
    return unauthorized();
  }

  try {
    const body = await parseJsonBody(request, createSchema);
    const created = await createOrganizationForUser({
      userId: session.user.id,
      organizationName: body.organizationName,
      workspaceName: body.workspaceName,
      defaultLanguage: body.defaultLanguage,
      countryCode: body.countryCode
    });

    const response = ok(created, { status: 201 });
    setActiveOrganizationCookie(response, created.organization.id);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid organization payload.");
    }

    return serverError("Unable to create organization.");
  }
}

export async function PATCH(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!["OWNER", "ADMIN"].includes(context.organizationRole)) {
    return badRequest("Only organization admins can update organization defaults.");
  }

  try {
    const body = await parseJsonBody(request, updateDefaultsSchema);
    const organization = await db.organization.update({
      where: {
        id: context.organizationId
      },
      data: {
        defaultLanguage: body.defaultLanguage.trim(),
        countryCode: body.countryCode.trim().toUpperCase()
      }
    });

    await createAuditEvent(db, {
      organizationId: organization.id,
      userId: context.userId,
      entityType: "organization",
      entityId: organization.id,
      action: "organization.defaults_updated",
      metadata: {
        defaultLanguage: organization.defaultLanguage,
        countryCode: organization.countryCode
      }
    });

    return ok(organization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid organization defaults payload.");
    }

    return serverError("Unable to update organization defaults.");
  }
}

export async function DELETE() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    await deleteOrganizationForUser({
      organizationId: context.organizationId,
      userId: context.userId
    });

    return ok({ success: true });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Unable to delete organization.");
  }
}

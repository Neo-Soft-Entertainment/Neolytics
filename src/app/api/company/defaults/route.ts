import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { createAuditEvent } from "@/lib/audit-service";
import { getApiContext } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  defaultLanguage: z.string().min(2).max(16),
  countryCode: z.string().length(2)
});

export async function PATCH(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!["OWNER", "ADMIN"].includes(context.organizationRole)) {
    return forbidden("Only organization admins can update company defaults.");
  }

  try {
    const body = await parseJsonBody(request, schema);
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
      action: "company.defaults_updated",
      metadata: {
        defaultLanguage: organization.defaultLanguage,
        countryCode: organization.countryCode
      }
    });

    return ok(organization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid company defaults payload.");
    }

    return serverError("Unable to update company defaults.");
  }
}

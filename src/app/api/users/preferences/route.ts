import { z } from "zod";

import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { createAuditEvent } from "@/lib/audit-service";
import { getApiContext } from "@/lib/auth-helpers";
import { languageOptions } from "@/lib/company-localization";
import { db } from "@/lib/db";
import { parseJsonBody } from "@/lib/request";

const languageValues = languageOptions.map((option) => option.value);

const schema = z.object({
  preferredLanguage: z.string().refine((value) => languageValues.some((language) => language === value), {
    message: "Invalid language."
  })
});

export async function PATCH(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    const body = await parseJsonBody(request, schema);
    const user = await db.user.update({
      where: {
        id: context.userId
      },
      data: {
        preferredLanguage: body.preferredLanguage
      },
      select: {
        id: true,
        preferredLanguage: true
      }
    });

    await createAuditEvent(db, {
      organizationId: context.organizationId,
      userId: context.userId,
      entityType: "user",
      entityId: context.userId,
      action: "user.language_updated",
      metadata: {
        preferredLanguage: user.preferredLanguage
      }
    });

    return ok(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid user preferences payload.");
    }

    return serverError("Unable to update user language.");
  }
}

import { CommerceChannelType } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageCommerce } from "@/lib/authorization";
import { createCommerceChannel } from "@/lib/commerce-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  name: z.string().min(2),
  type: z.nativeEnum(CommerceChannelType),
  externalCode: z.string().optional(),
  notes: z.string().optional()
});

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageCommerce(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only commerce managers can manage sales channels.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const channel = await createCommerceChannel({
      organizationId: context.organizationId,
      userId: context.userId,
      name: body.name,
      type: body.type,
      externalCode: body.externalCode,
      notes: body.notes
    });

    return ok(channel, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid channel payload.");
    }

    return serverError(error instanceof Error ? error.message : "Unable to create sales channel.");
  }
}

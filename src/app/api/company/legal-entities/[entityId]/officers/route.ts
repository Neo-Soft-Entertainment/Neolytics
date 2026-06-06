import { z } from "zod";

import { badRequest, forbidden, ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { createLegalEntityOfficer } from "@/lib/company-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  name: z.string().min(2),
  title: z.string().min(2),
  email: z.string().email().optional().or(z.literal(""))
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!["OWNER", "ADMIN"].includes(context.organizationRole)) {
    return forbidden("Only organization admins can manage company records.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const resolvedParams = await params;
    const officer = await createLegalEntityOfficer({
      organizationId: context.organizationId,
      legalEntityId: resolvedParams.entityId,
      userId: context.userId,
      name: body.name,
      title: body.title,
      email: body.email || undefined
    });

    return ok(officer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid officer payload.");
    }

    return badRequest(error instanceof Error ? error.message : "Unable to create officer.");
  }
}

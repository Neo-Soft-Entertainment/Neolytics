import { z } from "zod";

import { badRequest, forbidden, ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { createLegalEntityBranch } from "@/lib/company-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  name: z.string().min(2),
  code: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  cnpj: z.string().optional()
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
    const branch = await createLegalEntityBranch({
      organizationId: context.organizationId,
      legalEntityId: resolvedParams.entityId,
      userId: context.userId,
      ...body
    });

    return ok(branch, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid branch payload.");
    }

    return badRequest(error instanceof Error ? error.message : "Unable to create branch.");
  }
}

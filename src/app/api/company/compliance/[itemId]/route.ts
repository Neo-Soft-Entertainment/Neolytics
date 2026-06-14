import { ComplianceStatus } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageCompany } from "@/lib/authorization";
import { updateComplianceItem } from "@/lib/company-service";
import { parseJsonBody } from "@/lib/request";
import { getErrorMessage } from "@/lib/error-message";

const schema = z.object({
  status: z.nativeEnum(ComplianceStatus),
  notes: z.string().optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageCompany(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only organization admins can manage company records.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const resolvedParams = await params;
    const item = await updateComplianceItem({
      organizationId: context.organizationId,
      itemId: resolvedParams.itemId,
      userId: context.userId,
      ...body
    });

    return ok(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid compliance update payload.");
    }

    return badRequest(getErrorMessage(error, "Não foi possível atualizar o item de conformidade."));
  }
}

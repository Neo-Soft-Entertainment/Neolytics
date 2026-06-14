import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageFinance } from "@/lib/authorization";
import { createCostCenter } from "@/lib/finance-service";
import { parseJsonBody } from "@/lib/request";
import { getErrorMessage } from "@/lib/error-message";

const schema = z.object({
  code: z.string().min(1).max(12),
  name: z.string().min(2).max(120)
});

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageFinance(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only organization admins can manage cost centers.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const costCenter = await createCostCenter({
      organizationId: context.organizationId,
      userId: context.userId,
      code: body.code,
      name: body.name
    });

    return ok(costCenter, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid cost center payload.");
    }

    return serverError(getErrorMessage(error, "Não foi possível criar o centro de custo."));
  }
}

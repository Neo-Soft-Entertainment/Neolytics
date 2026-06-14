import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageFinance } from "@/lib/authorization";
import { updateBudgetLine } from "@/lib/finance-service";
import { parseJsonBody } from "@/lib/request";
import { getErrorMessage } from "@/lib/error-message";
import { invalidateServerCache } from "@/lib/server-memory-cache";

const optionalDate = z.preprocess((value) => {
  if (!value) {
    return undefined;
  }

  return new Date(String(value));
}, z.date().optional());

const schema = z.object({
  category: z.string().min(2),
  description: z.string().min(2),
  vendorName: z.string().optional(),
  plannedCents: z.coerce.number().int().nonnegative(),
  actualCents: z.coerce.number().int().nonnegative(),
  dueAt: optionalDate,
  paidAt: optionalDate
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ lineId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageFinance(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only organization admins can manage finance.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const { lineId } = await params;
    const line = await updateBudgetLine({
      organizationId: context.organizationId,
      userId: context.userId,
      lineId,
      category: body.category,
      description: body.description,
      vendorName: body.vendorName,
      plannedCents: body.plannedCents,
      actualCents: body.actualCents,
      dueAt: body.dueAt,
      paidAt: body.paidAt
    });

    invalidateServerCache(`finance:overview:${context.organizationId}`);
    return ok(line);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid budget line payload.");
    }

    return serverError(getErrorMessage(error, "Não foi possível atualizar a linha do orçamento."));
  }
}

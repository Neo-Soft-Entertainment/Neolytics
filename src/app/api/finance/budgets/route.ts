import { BudgetStatus } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageFinance } from "@/lib/authorization";
import { createBudget } from "@/lib/finance-service";
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
  projectId: z.string().optional(),
  name: z.string().min(2),
  status: z.nativeEnum(BudgetStatus).optional(),
  currencyCode: z.string().min(3).max(3).optional(),
  startsAt: optionalDate,
  endsAt: optionalDate,
  notes: z.string().optional()
});

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageFinance(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only organization admins can manage finance.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const budget = await createBudget({
      organizationId: context.organizationId,
      userId: context.userId,
      projectId: body.projectId,
      name: body.name,
      status: body.status,
      currencyCode: body.currencyCode,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      notes: body.notes
    });

    invalidateServerCache(`finance:overview:${context.organizationId}`);
    return ok(budget, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid budget payload.");
    }

    return serverError(getErrorMessage(error, "Não foi possível criar o orçamento."));
  }
}

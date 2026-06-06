import { BudgetStatus } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { updateBudget } from "@/lib/finance-service";
import { parseJsonBody } from "@/lib/request";

const optionalDate = z.preprocess((value) => {
  if (!value) {
    return undefined;
  }

  return new Date(String(value));
}, z.date().optional());

const schema = z.object({
  projectId: z.string().optional(),
  name: z.string().min(2),
  status: z.nativeEnum(BudgetStatus),
  currencyCode: z.string().min(3).max(3).optional(),
  startsAt: optionalDate,
  endsAt: optionalDate,
  notes: z.string().optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!["OWNER", "ADMIN"].includes(context.organizationRole)) {
    return forbidden("Only organization admins can manage finance.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const { budgetId } = await params;
    const budget = await updateBudget({
      organizationId: context.organizationId,
      userId: context.userId,
      budgetId,
      projectId: body.projectId,
      name: body.name,
      status: body.status,
      currencyCode: body.currencyCode,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      notes: body.notes
    });

    return ok(budget);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid budget payload.");
    }

    return serverError(error instanceof Error ? error.message : "Unable to update budget.");
  }
}

import { ExpenseCategory, FinanceEntryStatus } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageFinance } from "@/lib/authorization";
import { updateExpenseEntry } from "@/lib/finance-service";
import { parseJsonBody } from "@/lib/request";
import { getErrorMessage } from "@/lib/error-message";

const optionalDate = z.preprocess((value) => {
  if (!value) {
    return undefined;
  }

  return new Date(String(value));
}, z.date().optional());

const schema = z.object({
  projectId: z.string().optional(),
  category: z.nativeEnum(ExpenseCategory),
  vendorName: z.string().min(2),
  status: z.nativeEnum(FinanceEntryStatus),
  amountCents: z.coerce.number().int().nonnegative(),
  currencyCode: z.string().min(3).max(3).optional(),
  occurredAt: z.coerce.date(),
  dueAt: optionalDate,
  paidAt: optionalDate,
  notes: z.string().optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> }
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
    const { entryId } = await params;
    const entry = await updateExpenseEntry({
      organizationId: context.organizationId,
      userId: context.userId,
      entryId,
      projectId: body.projectId,
      category: body.category,
      vendorName: body.vendorName,
      status: body.status,
      amountCents: body.amountCents,
      currencyCode: body.currencyCode,
      occurredAt: body.occurredAt,
      dueAt: body.dueAt,
      paidAt: body.paidAt,
      notes: body.notes
    });

    return ok(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid expense payload.");
    }

    return serverError(getErrorMessage(error, "Não foi possível atualizar o lançamento de despesa."));
  }
}

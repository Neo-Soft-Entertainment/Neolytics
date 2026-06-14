import { FinanceEntryStatus, RevenueSourceType } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageFinance } from "@/lib/authorization";
import { updateRevenueEntry } from "@/lib/finance-service";
import { parseJsonBody } from "@/lib/request";
import { getErrorMessage } from "@/lib/error-message";
import { invalidateServerCache } from "@/lib/server-memory-cache";

const schema = z.object({
  projectId: z.string().optional(),
  sourceType: z.nativeEnum(RevenueSourceType),
  sourceName: z.string().min(2),
  status: z.nativeEnum(FinanceEntryStatus),
  grossCents: z.coerce.number().int().nonnegative(),
  netCents: z.coerce.number().int().nonnegative(),
  currencyCode: z.string().min(3).max(3).optional(),
  receivedAt: z.coerce.date(),
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
    const entry = await updateRevenueEntry({
      organizationId: context.organizationId,
      userId: context.userId,
      entryId,
      projectId: body.projectId,
      sourceType: body.sourceType,
      sourceName: body.sourceName,
      status: body.status,
      grossCents: body.grossCents,
      netCents: body.netCents,
      currencyCode: body.currencyCode,
      receivedAt: body.receivedAt,
      notes: body.notes
    });

    invalidateServerCache(`finance:overview:${context.organizationId}`);
    return ok(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid revenue payload.");
    }

    return serverError(getErrorMessage(error, "Não foi possível atualizar o lançamento de receita."));
  }
}

import { PayableTitleStatus } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageFinance } from "@/lib/authorization";
import { updatePayableTitle } from "@/lib/finance-service";
import { parseJsonBody } from "@/lib/request";
import { getErrorMessage } from "@/lib/error-message";
import { invalidateServerCache } from "@/lib/server-memory-cache";

const allocationSchema = z.object({
  costCenterId: z.string().min(1),
  natureDescription: z.string().min(2),
  amountCents: z.coerce.number().int().nonnegative()
});

const schema = z.object({
  projectId: z.string().optional(),
  costCenterId: z.string().min(1),
  prefix: z.string().min(1).max(20),
  titleNumber: z.string().min(1).max(8),
  documentType: z.string().min(2).max(80),
  natureDescription: z.string().min(2).max(160),
  supplierIdentifier: z.string().min(2).max(40),
  supplierName: z.string().min(2).max(160),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  titleAmountCents: z.coerce.number().int().nonnegative(),
  additionalAmountCents: z.coerce.number().int().nonnegative().optional(),
  currencyCode: z.string().min(3).max(3).optional(),
  notes: z.string().optional(),
  status: z.nativeEnum(PayableTitleStatus).optional(),
  allocations: z.array(allocationSchema).optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ titleId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageFinance(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only organization admins can manage accounts payable.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const { titleId } = await params;
    const title = await updatePayableTitle({
      organizationId: context.organizationId,
      userId: context.userId,
      titleId,
      projectId: body.projectId,
      costCenterId: body.costCenterId,
      prefix: body.prefix,
      titleNumber: body.titleNumber,
      documentType: body.documentType,
      natureDescription: body.natureDescription,
      supplierIdentifier: body.supplierIdentifier,
      supplierName: body.supplierName,
      issueDate: body.issueDate,
      dueDate: body.dueDate,
      titleAmountCents: body.titleAmountCents,
      additionalAmountCents: body.additionalAmountCents,
      currencyCode: body.currencyCode,
      notes: body.notes,
      status: body.status,
      allocations: body.allocations
    });

    invalidateServerCache(`finance:overview:${context.organizationId}`);
    return ok(title);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid payable title payload.");
    }

    return serverError(getErrorMessage(error, "Não foi possível atualizar o título a pagar."));
  }
}

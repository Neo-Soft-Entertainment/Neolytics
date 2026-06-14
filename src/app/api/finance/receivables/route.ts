import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageFinance } from "@/lib/authorization";
import { createReceivableTitle } from "@/lib/finance-service";
import { parseJsonBody } from "@/lib/request";
import { getErrorMessage } from "@/lib/error-message";

const schema = z.object({
  projectId: z.string().optional(),
  prefix: z.string().min(1).max(20),
  titleNumber: z.string().min(1).max(12),
  documentType: z.string().min(2).max(80),
  sourceDescription: z.string().min(2).max(160),
  customerIdentifier: z.string().min(2).max(40),
  customerName: z.string().min(2).max(160),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  titleAmountCents: z.coerce.number().int().nonnegative(),
  currencyCode: z.string().min(3).max(3).optional(),
  notes: z.string().optional()
});

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageFinance(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only organization admins can manage accounts receivable.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const title = await createReceivableTitle({
      organizationId: context.organizationId,
      userId: context.userId,
      projectId: body.projectId,
      prefix: body.prefix,
      titleNumber: body.titleNumber,
      documentType: body.documentType,
      sourceDescription: body.sourceDescription,
      customerIdentifier: body.customerIdentifier,
      customerName: body.customerName,
      issueDate: body.issueDate,
      dueDate: body.dueDate,
      titleAmountCents: body.titleAmountCents,
      currencyCode: body.currencyCode,
      notes: body.notes
    });

    return ok(title, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid receivable title payload.");
    }

    return serverError(getErrorMessage(error, "Não foi possível criar o título a receber."));
  }
}

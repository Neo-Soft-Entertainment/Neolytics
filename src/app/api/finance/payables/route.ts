import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { createPayableTitle } from "@/lib/finance-service";
import { parseJsonBody } from "@/lib/request";

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
  allocations: z.array(allocationSchema).optional()
});

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!["OWNER", "ADMIN"].includes(context.organizationRole)) {
    return forbidden("Only organization admins can manage accounts payable.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const title = await createPayableTitle({
      organizationId: context.organizationId,
      userId: context.userId,
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
      allocations: body.allocations
    });

    return ok(title, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid payable title payload.");
    }

    return serverError(error instanceof Error ? error.message : "Unable to create payable title.");
  }
}

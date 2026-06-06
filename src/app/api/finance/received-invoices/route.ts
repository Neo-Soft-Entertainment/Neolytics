import { InvoiceStatus } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { createReceivedInvoice } from "@/lib/finance-service";
import { parseJsonBody } from "@/lib/request";

const optionalDate = z.preprocess((value) => {
  if (!value) {
    return undefined;
  }

  return new Date(String(value));
}, z.date().optional());

const schema = z.object({
  projectId: z.string().optional(),
  contractId: z.string().optional(),
  invoiceNumber: z.string().min(2),
  vendorName: z.string().min(2),
  status: z.nativeEnum(InvoiceStatus),
  amountCents: z.coerce.number().int().nonnegative(),
  currencyCode: z.string().min(3).max(3).optional(),
  issuedAt: optionalDate,
  dueAt: optionalDate,
  paidAt: optionalDate,
  notes: z.string().optional()
});

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!["OWNER", "ADMIN"].includes(context.organizationRole)) {
    return forbidden("Only organization admins can manage invoices.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const invoice = await createReceivedInvoice({
      organizationId: context.organizationId,
      userId: context.userId,
      projectId: body.projectId,
      contractId: body.contractId,
      invoiceNumber: body.invoiceNumber,
      vendorName: body.vendorName,
      status: body.status,
      amountCents: body.amountCents,
      currencyCode: body.currencyCode,
      issuedAt: body.issuedAt,
      dueAt: body.dueAt,
      paidAt: body.paidAt,
      notes: body.notes
    });

    return ok(invoice, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid received invoice payload.");
    }

    return serverError(error instanceof Error ? error.message : "Unable to create received invoice.");
  }
}

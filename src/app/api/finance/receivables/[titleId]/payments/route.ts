import { PayablePaymentType } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageFinance } from "@/lib/authorization";
import { createReceivablePayment } from "@/lib/finance-service";
import { parseJsonBody } from "@/lib/request";
import { getErrorMessage } from "@/lib/error-message";
import { invalidateServerCache } from "@/lib/server-memory-cache";

const schema = z.object({
  paymentType: z.nativeEnum(PayablePaymentType),
  bank: z.string().optional(),
  branch: z.string().optional(),
  account: z.string().optional(),
  receivedAt: z.coerce.date(),
  history: z.string().optional(),
  discountCents: z.coerce.number().int().nonnegative().optional(),
  interestCents: z.coerce.number().int().nonnegative().optional(),
  amountReceivedCents: z.coerce.number().int().positive()
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ titleId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageFinance(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only organization admins can manage accounts receivable.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const { titleId } = await params;
    const payment = await createReceivablePayment({
      organizationId: context.organizationId,
      userId: context.userId,
      titleId,
      paymentType: body.paymentType,
      bank: body.bank,
      branch: body.branch,
      account: body.account,
      receivedAt: body.receivedAt,
      history: body.history,
      discountCents: body.discountCents,
      interestCents: body.interestCents,
      amountReceivedCents: body.amountReceivedCents
    });

    invalidateServerCache(`finance:overview:${context.organizationId}`);
    return ok(payment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid receivable payment payload.");
    }

    return serverError(getErrorMessage(error, "Não foi possível registrar o recebimento."));
  }
}

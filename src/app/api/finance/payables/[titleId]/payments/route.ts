import { PayablePaymentType } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageFinance } from "@/lib/authorization";
import { createPayablePayment } from "@/lib/finance-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  paymentType: z.nativeEnum(PayablePaymentType),
  bank: z.string().optional(),
  branch: z.string().optional(),
  account: z.string().optional(),
  paymentDate: z.coerce.date(),
  history: z.string().optional(),
  fineCents: z.coerce.number().int().nonnegative().optional(),
  interestCents: z.coerce.number().int().nonnegative().optional(),
  amountPaidCents: z.coerce.number().int().positive()
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
    return forbidden("Only organization admins can manage accounts payable.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const { titleId } = await params;
    const payment = await createPayablePayment({
      organizationId: context.organizationId,
      userId: context.userId,
      titleId,
      paymentType: body.paymentType,
      bank: body.bank,
      branch: body.branch,
      account: body.account,
      paymentDate: body.paymentDate,
      history: body.history,
      fineCents: body.fineCents,
      interestCents: body.interestCents,
      amountPaidCents: body.amountPaidCents
    });

    return ok(payment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid payable payment payload.");
    }

    return serverError(error instanceof Error ? error.message : "Não foi possível registrar o pagamento a pagar.");
  }
}

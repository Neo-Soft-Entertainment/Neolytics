import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageFinance } from "@/lib/authorization";
import { createRoyaltyStatement } from "@/lib/finance-service";
import { parseJsonBody } from "@/lib/request";

const optionalDate = z.preprocess((value) => {
  if (!value) {
    return undefined;
  }

  return new Date(String(value));
}, z.date().optional());

const schema = z.object({
  projectId: z.string().optional(),
  royaltyAgreementId: z.string().min(2),
  periodLabel: z.string().min(2),
  periodStart: optionalDate,
  periodEnd: optionalDate,
  grossRevenueCents: z.coerce.number().int().nonnegative(),
  deductibleCents: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().optional()
});

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageFinance(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only organization admins can manage royalty statements.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const statement = await createRoyaltyStatement({
      organizationId: context.organizationId,
      userId: context.userId,
      projectId: body.projectId,
      royaltyAgreementId: body.royaltyAgreementId,
      periodLabel: body.periodLabel,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      grossRevenueCents: body.grossRevenueCents,
      deductibleCents: body.deductibleCents,
      notes: body.notes
    });

    return ok(statement, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid royalty statement payload.");
    }

    return serverError(error instanceof Error ? error.message : "Não foi possível criar o demonstrativo de royalties.");
  }
}

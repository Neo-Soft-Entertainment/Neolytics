import { ContractCounterpartyType, ContractStatus } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageFinance } from "@/lib/authorization";
import { updateContract } from "@/lib/finance-service";
import { parseJsonBody } from "@/lib/request";

const optionalDate = z.preprocess((value) => {
  if (!value) {
    return undefined;
  }

  return new Date(String(value));
}, z.date().optional());

const schema = z.object({
  projectId: z.string().optional(),
  title: z.string().min(2),
  counterpartyName: z.string().min(2),
  counterpartyType: z.nativeEnum(ContractCounterpartyType),
  status: z.nativeEnum(ContractStatus),
  currencyCode: z.string().min(3).max(3).optional(),
  totalValueCents: z.coerce.number().int().nonnegative().nullable().optional(),
  startsAt: optionalDate,
  endsAt: optionalDate,
  signedAt: optionalDate,
  autoRenews: z.boolean().optional(),
  notes: z.string().optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageFinance(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only organization admins can manage contracts.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const { contractId } = await params;
    const contract = await updateContract({
      organizationId: context.organizationId,
      userId: context.userId,
      contractId,
      projectId: body.projectId,
      title: body.title,
      counterpartyName: body.counterpartyName,
      counterpartyType: body.counterpartyType,
      status: body.status,
      currencyCode: body.currencyCode,
      totalValueCents: body.totalValueCents,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      signedAt: body.signedAt,
      autoRenews: body.autoRenews,
      notes: body.notes
    });

    return ok(contract);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid contract payload.");
    }

    return serverError(error instanceof Error ? error.message : "Não foi possível atualizar o contrato.");
  }
}

import { RoyaltyStatus } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageFinance } from "@/lib/authorization";
import { createRoyaltyAgreement } from "@/lib/finance-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  projectId: z.string().optional(),
  contractId: z.string().optional(),
  name: z.string().min(2),
  partnerName: z.string().min(2),
  status: z.nativeEnum(RoyaltyStatus),
  basisPoints: z.coerce.number().int().min(1).max(10000),
  recoupable: z.boolean().optional(),
  recoupCapCents: z.coerce.number().int().nonnegative().nullable().optional(),
  notes: z.string().optional()
});

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageFinance(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only organization admins can manage royalty agreements.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const agreement = await createRoyaltyAgreement({
      organizationId: context.organizationId,
      userId: context.userId,
      projectId: body.projectId,
      contractId: body.contractId,
      name: body.name,
      partnerName: body.partnerName,
      status: body.status,
      basisPoints: body.basisPoints,
      recoupable: body.recoupable,
      recoupCapCents: body.recoupCapCents,
      notes: body.notes
    });

    return ok(agreement, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid royalty payload.");
    }

    return serverError(error instanceof Error ? error.message : "Não foi possível criar o acordo de royalties.");
  }
}

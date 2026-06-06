import { FinanceEntryStatus, RevenueSourceType } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { createRevenueEntry } from "@/lib/finance-service";
import { parseJsonBody } from "@/lib/request";

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

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!["OWNER", "ADMIN"].includes(context.organizationRole)) {
    return forbidden("Only organization admins can manage finance.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const entry = await createRevenueEntry({
      organizationId: context.organizationId,
      userId: context.userId,
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

    return ok(entry, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid revenue payload.");
    }

    return serverError(error instanceof Error ? error.message : "Unable to create revenue entry.");
  }
}

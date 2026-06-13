import { TaxRegime } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageCompany } from "@/lib/authorization";
import { updateLegalEntity } from "@/lib/company-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  name: z.string().min(2),
  tradeName: z.string().optional(),
  cnpj: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  legalNature: z.string().optional(),
  taxRegime: z.nativeEnum(TaxRegime).optional(),
  cnaePrimary: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  city: z.string().optional(),
  state: z.string().optional(),
  addressLine1: z.string().optional(),
  district: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageCompany(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only organization admins can manage company records.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const resolvedParams = await params;
    const entity = await updateLegalEntity({
      organizationId: context.organizationId,
      entityId: resolvedParams.entityId,
      userId: context.userId,
      ...body,
      email: body.email || undefined,
      websiteUrl: body.websiteUrl || undefined
    });

    return ok(entity);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid legal entity payload.");
    }

    return badRequest(error instanceof Error ? error.message : "Unable to update legal entity.");
  }
}

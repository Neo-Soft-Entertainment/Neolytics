import { TaxRegime } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageCompany } from "@/lib/authorization";
import { createLegalEntity, getCompanyModuleData } from "@/lib/company-service";
import { parseJsonBody } from "@/lib/request";
import { enforceSubscriptionCapability } from "@/lib/subscription-service";

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
  state: z.string().optional()
});

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    await enforceSubscriptionCapability(context.organizationId, "companyHub");
    const data = await getCompanyModuleData(context.organizationId);
    return ok({ legalEntities: data.legalEntities });
  } catch {
    return serverError("Não foi possível carregar as entidades legais.");
  }
}

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageCompany(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only organization admins can manage company records.");
  }

  try {
    await enforceSubscriptionCapability(context.organizationId, "companyHub");
    const body = await parseJsonBody(request, schema);
    const entity = await createLegalEntity({
      organizationId: context.organizationId,
      userId: context.userId,
      name: body.name,
      tradeName: body.tradeName,
      cnpj: body.cnpj,
      countryCode: body.countryCode,
      legalNature: body.legalNature,
      taxRegime: body.taxRegime,
      cnaePrimary: body.cnaePrimary,
      email: body.email || undefined,
      phone: body.phone,
      websiteUrl: body.websiteUrl || undefined,
      city: body.city,
      state: body.state
    });

    return ok(entity, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid legal entity payload.");
    }

    return badRequest(error instanceof Error ? error.message : "Não foi possível criar a entidade legal.");
  }
}

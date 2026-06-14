import { ComplianceType } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageCompany } from "@/lib/authorization";
import { createComplianceItem, getCompanyModuleData } from "@/lib/company-service";
import { parseJsonBody } from "@/lib/request";
import { enforceSubscriptionCapability } from "@/lib/subscription-service";
import { getErrorMessage } from "@/lib/error-message";

const schema = z.object({
  title: z.string().min(2),
  type: z.nativeEnum(ComplianceType),
  legalEntityId: z.string().optional(),
  projectId: z.string().optional(),
  ownerUserId: z.string().optional(),
  sourceDocumentId: z.string().optional(),
  dueAt: z.string().optional(),
  notes: z.string().optional()
});

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    await enforceSubscriptionCapability(context.organizationId, "companyHub");
    const data = await getCompanyModuleData(context.organizationId);
    return ok({ complianceItems: data.complianceItems });
  } catch {
    return serverError("Não foi possível carregar os itens de conformidade.");
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
    const item = await createComplianceItem({
      organizationId: context.organizationId,
      userId: context.userId,
      title: body.title,
      type: body.type,
      legalEntityId: body.legalEntityId,
      projectId: body.projectId,
      ownerUserId: body.ownerUserId,
      sourceDocumentId: body.sourceDocumentId,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      notes: body.notes
    });

    return ok(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid compliance payload.");
    }

    return badRequest(getErrorMessage(error, "Não foi possível criar o item de conformidade."));
  }
}

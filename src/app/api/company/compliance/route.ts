import { ComplianceType } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { createComplianceItem, getCompanyModuleData } from "@/lib/company-service";
import { parseJsonBody } from "@/lib/request";

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
    const data = await getCompanyModuleData(context.organizationId);
    return ok({ complianceItems: data.complianceItems });
  } catch {
    return serverError("Unable to load compliance items.");
  }
}

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!["OWNER", "ADMIN"].includes(context.organizationRole)) {
    return forbidden("Only organization admins can manage company records.");
  }

  try {
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

    return badRequest(error instanceof Error ? error.message : "Unable to create compliance item.");
  }
}

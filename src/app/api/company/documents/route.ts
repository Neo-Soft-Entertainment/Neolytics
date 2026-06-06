import { CompanyDocumentType } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { createCompanyDocument, getCompanyModuleData } from "@/lib/company-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  title: z.string().min(2),
  type: z.nativeEnum(CompanyDocumentType),
  legalEntityId: z.string().optional(),
  projectId: z.string().optional(),
  issuer: z.string().optional(),
  documentNumber: z.string().optional(),
  expiresAt: z.string().optional(),
  storagePath: z.string().min(3),
  originalName: z.string().min(1),
  mimeType: z.string().min(3)
});

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    const data = await getCompanyModuleData(context.organizationId);
    return ok({ documents: data.documents });
  } catch {
    return serverError("Unable to load documents.");
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
    const document = await createCompanyDocument({
      organizationId: context.organizationId,
      userId: context.userId,
      title: body.title,
      type: body.type,
      legalEntityId: body.legalEntityId,
      projectId: body.projectId,
      issuer: body.issuer,
      documentNumber: body.documentNumber,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      storagePath: body.storagePath,
      originalName: body.originalName,
      mimeType: body.mimeType
    });

    return ok(document, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid document payload.");
    }

    return badRequest(error instanceof Error ? error.message : "Unable to create document.");
  }
}

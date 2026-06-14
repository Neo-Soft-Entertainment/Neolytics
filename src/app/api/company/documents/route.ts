import { CompanyDocumentType } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageCompany } from "@/lib/authorization";
import { createCompanyDocument, getCompanyModuleData } from "@/lib/company-service";
import { uploadCompanyDocumentFile } from "@/lib/company-storage";
import { enforceSubscriptionCapability } from "@/lib/subscription-service";

const schema = z.object({
  title: z.string().min(2),
  type: z.nativeEnum(CompanyDocumentType),
  legalEntityId: z.string().optional(),
  projectId: z.string().optional(),
  issuer: z.string().optional(),
  documentNumber: z.string().optional(),
  expiresAt: z.string().optional()
});

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    await enforceSubscriptionCapability(context.organizationId, "documentVault");
    const data = await getCompanyModuleData(context.organizationId);
    return ok({ documents: data.documents });
  } catch {
    return serverError("Não foi possível carregar os documentos.");
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
    await enforceSubscriptionCapability(context.organizationId, "documentVault");
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return badRequest("A document file is required.");
    }

    const body = schema.parse({
      title: formData.get("title"),
      type: formData.get("type"),
      legalEntityId: formData.get("legalEntityId") || undefined,
      projectId: formData.get("projectId") || undefined,
      issuer: formData.get("issuer") || undefined,
      documentNumber: formData.get("documentNumber") || undefined,
      expiresAt: formData.get("expiresAt") || undefined
    });
    const upload = await uploadCompanyDocumentFile({
      organizationId: context.organizationId,
      file,
      folder: "documents"
    });
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
      storagePath: upload.storagePath,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
      checksum: upload.checksum
    });

    return ok(document, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid document payload.");
    }

    return badRequest(error instanceof Error ? error.message : "Não foi possível criar o documento.");
  }
}

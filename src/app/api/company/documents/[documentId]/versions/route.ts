import { z } from "zod";

import { badRequest, forbidden, ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageCompany } from "@/lib/authorization";
import { addCompanyDocumentVersion } from "@/lib/company-service";
import { uploadCompanyDocumentFile } from "@/lib/company-storage";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageCompany(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only organization admins can manage company records.");
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return badRequest("A document file is required.");
    }

    const resolvedParams = await params;
    const upload = await uploadCompanyDocumentFile({
      organizationId: context.organizationId,
      file,
      folder: `documents/${resolvedParams.documentId}`
    });
    const version = await addCompanyDocumentVersion({
      organizationId: context.organizationId,
      documentId: resolvedParams.documentId,
      userId: context.userId,
      storagePath: upload.storagePath,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
      checksum: upload.checksum
    });

    return ok(version, { status: 201 });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Unable to create document version.");
  }
}

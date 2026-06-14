import { badRequest, forbidden, ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { createCompanyDocumentSignedUrl } from "@/lib/company-storage";
import { enforceSubscriptionCapability } from "@/lib/subscription-service";
import { getErrorMessage } from "@/lib/error-message";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!["OWNER", "ADMIN", "MEMBER", "VIEWER"].includes(context.organizationRole)) {
    return forbidden();
  }

  try {
    await enforceSubscriptionCapability(context.organizationId, "documentVault");
    const resolvedParams = await params;
    const url = new URL(request.url);
    const versionId = url.searchParams.get("versionId");
    const document = await db.companyDocument.findFirst({
      where: {
        id: resolvedParams.documentId,
        organizationId: context.organizationId
      },
      include: {
        versions: {
          orderBy: {
            version: "desc"
          }
        }
      }
    });

    if (!document) {
      return badRequest("Document not found.");
    }

    const version = versionId
      ? document.versions.find((item) => item.id === versionId)
      : document.versions[0];

    if (!version) {
      return badRequest("Document version not found.");
    }

    const signedUrl = await createCompanyDocumentSignedUrl(version.storagePath);
    return ok({
      url: signedUrl
    });
  } catch (error) {
    return badRequest(getErrorMessage(error, "Não foi possível abrir o documento."));
  }
}

import { z } from "zod";

import { badRequest, forbidden, ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { addCompanyDocumentVersion } from "@/lib/company-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  storagePath: z.string().min(3),
  originalName: z.string().min(1),
  mimeType: z.string().min(3)
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!["OWNER", "ADMIN"].includes(context.organizationRole)) {
    return forbidden("Only organization admins can manage company records.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const resolvedParams = await params;
    const version = await addCompanyDocumentVersion({
      organizationId: context.organizationId,
      documentId: resolvedParams.documentId,
      userId: context.userId,
      ...body
    });

    return ok(version, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid document version payload.");
    }

    return badRequest(error instanceof Error ? error.message : "Unable to create document version.");
  }
}

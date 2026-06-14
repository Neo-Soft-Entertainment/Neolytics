import { DataSubjectRequestStatus } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { hasPrivacyPermission } from "@/lib/privacy/permissions";
import { parseJsonBody } from "@/lib/request";
import { reviewDataSubjectRequest } from "@/lib/privacy/data-subject-request-service";

const schema = z.object({
  status: z.nativeEnum(DataSubjectRequestStatus),
  resolution: z.string().trim().min(2).max(500).optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!hasPrivacyPermission(context.organizationRole, context.organizationPermissions, "review_privacy_requests")) {
    return forbidden("Este cargo não pode revisar solicitações de privacidade.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const { requestId } = await params;

    const reviewedRequest = await reviewDataSubjectRequest({
      requestId,
      organizationId: context.organizationId,
      handledById: context.userId,
      actorRole: context.organizationRole,
      status: body.status,
      resolution: body.resolution
    });

    return ok(reviewedRequest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid review payload.");
    }

    return serverError(error instanceof Error ? error.message : "Não foi possível revisar a solicitação.");
  }
}

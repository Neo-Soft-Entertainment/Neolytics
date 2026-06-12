import { DataSubjectRequestType } from "@prisma/client";
import { z } from "zod";

import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { assertPublicApiRateLimit, getPublicApiRateLimitKey } from "@/lib/auth-rate-limit";
import {
  createDataSubjectRequest,
  listUserDataSubjectRequests
} from "@/lib/privacy/data-subject-request-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  requestType: z.nativeEnum(DataSubjectRequestType),
  reason: z.string().trim().min(2).max(500).optional()
});

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  return ok({
    requests: await listUserDataSubjectRequests(context.userId)
  });
}

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    await assertPublicApiRateLimit(getPublicApiRateLimitKey(request, "privacy-requests"));

    const body = await parseJsonBody(request, schema);
    const createdRequest = await createDataSubjectRequest({
      userId: context.userId,
      organizationId: context.organizationId,
      actorRole: context.organizationRole,
      requestType: body.requestType,
      reason: body.reason
    });

    return ok(createdRequest, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid privacy request payload.");
    }

    return serverError(error instanceof Error ? error.message : "Unable to create privacy request.");
  }
}

import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { createCommunityPostComment } from "@/lib/community-service";
import { EntitlementError, assertCanUseFeature, entitlementErrorResponse } from "@/lib/entitlements";
import { parseJsonBody } from "@/lib/request";
import { SubscriptionLimitError } from "@/lib/subscription-service";

const schema = z.object({
  content: z.string().trim().min(1, "Write a comment before sending.").max(2000, "Comments must be 2,000 characters or less.")
});

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
      return forbidden("Viewers cannot comment on community posts.");
    }

    await assertCanUseFeature({
      userId: context.userId,
      workspaceId: context.workspace.id,
      organizationId: context.organizationId
    }, "communityFeed");

    const { postId } = await params;
    const body = await parseJsonBody(request, schema);
    const comment = await createCommunityPostComment({
      organizationId: context.organizationId,
      userId: context.userId,
      postId,
      content: body.content
    });

    return ok(comment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid comment payload.");
    }

    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    if (error instanceof EntitlementError) {
      return entitlementErrorResponse(error);
    }

    return serverError("Unable to create community comment.");
  }
}

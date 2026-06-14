import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { createCommunityPostComment } from "@/lib/community-service";
import { EntitlementError, assertCanUseFeature, entitlementErrorResponse } from "@/lib/entitlements";
import { parseJsonBody } from "@/lib/request";
import { invalidateServerCache } from "@/lib/server-memory-cache";
import { SubscriptionLimitError } from "@/lib/subscription-service";

const schema = z.object({
  content: z.string().trim().min(1, "Escreva um comentário antes de enviar.").max(2000, "Comentários devem ter 2.000 caracteres ou menos.")
});

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
      return forbidden("Visualizadores não podem comentar nas postagens da comunidade.");
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

    invalidateServerCache(`community:${context.organizationId}:`);
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

    return serverError("Não foi possível criar o comentário na comunidade.");
  }
}

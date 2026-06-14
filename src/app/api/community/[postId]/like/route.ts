import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { toggleCommunityPostLike } from "@/lib/community-service";
import { invalidateServerCache } from "@/lib/server-memory-cache";
import { SubscriptionLimitError } from "@/lib/subscription-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  void request;
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    const { postId } = await params;
    const result = await toggleCommunityPostLike({
      organizationId: context.organizationId,
      userId: context.userId,
      postId
    });

    invalidateServerCache(`community:${context.organizationId}:`);
    return ok(result);
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    return serverError("Não foi possível atualizar a reação da postagem.");
  }
}

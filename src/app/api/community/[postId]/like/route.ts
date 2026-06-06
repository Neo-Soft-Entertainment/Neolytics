import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { toggleCommunityPostLike } from "@/lib/community-service";
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

    return ok(result);
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    return serverError("Unable to update post reaction.");
  }
}

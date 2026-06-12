import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageOrganization } from "@/lib/authorization";
import { deleteCommunityPost } from "@/lib/community-service";
import { SubscriptionLimitError } from "@/lib/subscription-service";

export async function DELETE(
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
    const result = await deleteCommunityPost({
      organizationId: context.organizationId,
      userId: context.userId,
      postId,
      canManage: canManageOrganization(context.organizationRole)
    });

    return ok(result);
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    if (error instanceof Error && error.message.includes("own community posts")) {
      return forbidden(error.message);
    }

    return serverError("Unable to delete community post.");
  }
}

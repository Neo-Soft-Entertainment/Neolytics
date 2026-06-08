import { CommunityPostType } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { createCommunityPost, getCommunityRanking, listCommunityFeed } from "@/lib/community-service";
import { parseJsonBody } from "@/lib/request";
import { SubscriptionLimitError } from "@/lib/subscription-service";

const schema = z.object({
  title: z.string().min(2),
  content: z.string().min(10),
  type: z.nativeEnum(CommunityPostType).optional(),
  projectId: z.string().cuid().nullable().optional(),
  tags: z.array(z.string().min(1)).max(8).optional()
});

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole)) {
    return forbidden("Viewers cannot create community posts.");
  }

  try {
    const [feed, ranking] = await Promise.all([
      listCommunityFeed(context.organizationId, context.userId),
      getCommunityRanking(context.organizationId)
    ]);

    return ok({ feed, ranking });
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    return serverError("Unable to load community.");
  }
}

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    const body = await parseJsonBody(request, schema);
    const post = await createCommunityPost({
      organizationId: context.organizationId,
      workspaceId: context.workspace.id,
      authorId: context.userId,
      title: body.title,
      content: body.content,
      type: body.type,
      projectId: body.projectId ?? null,
      tags: body.tags
    });

    return ok(post, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid community post payload.");
    }

    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    return serverError("Unable to create community post.");
  }
}

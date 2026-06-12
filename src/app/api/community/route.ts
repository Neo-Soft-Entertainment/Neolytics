import { CommunityPostType } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageOrganization, canWriteOrganization } from "@/lib/authorization";
import { createCommunityPost, getCommunityRanking, listCommunityFeed } from "@/lib/community-service";
import { EntitlementError, assertCanUseFeature, entitlementErrorResponse } from "@/lib/entitlements";
import { parseJsonBody } from "@/lib/request";
import { SubscriptionLimitError } from "@/lib/subscription-service";

const schema = z.object({
  title: z.string().min(2),
  content: z.string().min(10),
  type: z.nativeEnum(CommunityPostType).optional(),
  projectId: z.string().cuid().nullable().optional(),
  tags: z.array(z.string().min(1)).max(8).optional()
});

async function parseCommunityPostRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return {
      body: await parseJsonBody(request, schema),
      mediaFiles: [] as File[]
    };
  }

  const formData = await request.formData();
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const body = schema.parse({
    title: String(formData.get("title") ?? ""),
    content: String(formData.get("content") ?? ""),
    type: formData.get("type") || undefined,
    projectId: formData.get("projectId") === "none" ? null : formData.get("projectId") || null,
    tags
  });
  const mediaFiles = formData.getAll("media").filter((item): item is File => item instanceof File);

  return {
    body,
    mediaFiles
  };
}

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    const entitlementContext = {
      userId: context.userId,
      workspaceId: context.workspace.id,
      organizationId: context.organizationId
    };

    await assertCanUseFeature(entitlementContext, "communityFeed");
    await assertCanUseFeature(entitlementContext, "communityRanking");

    const [feed, ranking] = await Promise.all([
      listCommunityFeed(context.organizationId, context.userId),
      getCommunityRanking(context.organizationId)
    ]);

    return ok({
      feed: feed.map((post) => ({
        ...post,
        canDelete: post.authorId === context.userId || canManageOrganization(context.organizationRole)
      })),
      ranking
    });
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    if (error instanceof EntitlementError) {
      return entitlementErrorResponse(error);
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
    if (!canWriteOrganization(context.organizationRole)) {
      return forbidden("Viewers cannot create community posts.");
    }

    await assertCanUseFeature({
      userId: context.userId,
      workspaceId: context.workspace.id,
      organizationId: context.organizationId
    }, "communityFeed");

    const { body, mediaFiles } = await parseCommunityPostRequest(request);
    const post = await createCommunityPost({
      organizationId: context.organizationId,
      workspaceId: context.workspace.id,
      authorId: context.userId,
      title: body.title,
      content: body.content,
      type: body.type,
      projectId: body.projectId ?? null,
      tags: body.tags,
      mediaFiles
    });

    return ok(post, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid community post payload.");
    }

    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    if (error instanceof EntitlementError) {
      return entitlementErrorResponse(error);
    }

    return serverError("Unable to create community post.");
  }
}

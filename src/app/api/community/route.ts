import { CommunityPostPriority, CommunityPostScope, CommunityPostType } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageCommunity, canWriteOrganization } from "@/lib/authorization";
import { createCommunityPost, getCommunityRanking, listCommunityFeed } from "@/lib/community-service";
import { EntitlementError, assertCanUseFeature, entitlementErrorResponse } from "@/lib/entitlements";
import { parseJsonBody } from "@/lib/request";
import { invalidateServerCache, readServerCache } from "@/lib/server-memory-cache";
import { SubscriptionLimitError } from "@/lib/subscription-service";

const schema = z.object({
  title: z.string().trim().optional(),
  content: z.string().trim().min(1, "Escreva algo antes de publicar."),
  scope: z.nativeEnum(CommunityPostScope).optional(),
  priority: z.nativeEnum(CommunityPostPriority).optional(),
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
    title: String(formData.get("title") ?? "") || undefined,
    content: String(formData.get("content") ?? ""),
    scope: formData.get("scope") || undefined,
    priority: formData.get("priority") || undefined,
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

export async function GET(request: Request) {
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

    const scopeParam = new URL(request.url).searchParams.get("scope");
    let scope: CommunityPostScope = CommunityPostScope.ORGANIZATION;

    if (scopeParam === CommunityPostScope.GLOBAL) {
      scope = CommunityPostScope.GLOBAL;
    }

    const response = await readServerCache(
      `community:${context.organizationId}:${context.userId}:${scope}`,
      1000 * 30,
      async () => {
        const [feed, ranking] = await Promise.all([
          listCommunityFeed(context.organizationId, context.userId, scope),
          getCommunityRanking(context.organizationId, scope)
        ]);

        return {
          feed: feed.map((post) => ({
            ...post,
            canDelete: post.authorId === context.userId || canManageCommunity(context.organizationRole, context.organizationPermissions)
          })),
          ranking
        };
      }
    );

    return ok(response);
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    if (error instanceof EntitlementError) {
      return entitlementErrorResponse(error);
    }

    return serverError("Não foi possível carregar a comunidade.");
  }
}

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
      return forbidden("Visualizadores não podem criar postagens na comunidade.");
    }

    await assertCanUseFeature({
      userId: context.userId,
      workspaceId: context.workspace.id,
      organizationId: context.organizationId
    }, "communityFeed");

    const { body, mediaFiles } = await parseCommunityPostRequest(request);
    const title = body.title || body.content.split("\n")[0]?.slice(0, 80) || "Community post";
    const post = await createCommunityPost({
      organizationId: context.organizationId,
      workspaceId: context.workspace.id,
      authorId: context.userId,
      title,
      content: body.content,
      scope: body.scope,
      priority: body.priority,
      type: body.type,
      projectId: body.projectId ?? null,
      tags: body.tags,
      mediaFiles
    });

    invalidateServerCache(`community:${context.organizationId}:`);
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

    return serverError("Não foi possível criar a postagem na comunidade.");
  }
}

import { CommunityPostPriority, CommunityPostScope, CommunityPostType, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { notifyOrganizationDiscordWebhook } from "@/lib/discord";
import { decryptNullableString, encryptNullableString } from "@/lib/security/encryption";
import {
  CommunityMediaItem,
  createCommunityImageSignedUrls,
  deleteCommunityImages,
  uploadCommunityImages
} from "@/lib/community-storage";
import { enforceSubscriptionCapability } from "@/lib/subscription-service";

const communityPostInclude = {
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true
    }
  },
  project: {
    select: {
      id: true,
      name: true,
      stage: true
    }
  },
  comments: {
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      }
    },
    orderBy: [
      { createdAt: "asc" }
    ],
    take: 25
  }
} satisfies Prisma.CommunityPostInclude;

function getPostMedia(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is CommunityMediaItem => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return false;
    }

    return typeof item.storagePath === "string"
      && typeof item.originalName === "string"
      && typeof item.mimeType === "string"
      && typeof item.sizeBytes === "number";
  });
}

async function hydrateCommunityPost<T extends {
  organizationId: string;
  title: string;
  content: string;
  media?: Prisma.JsonValue | null;
  comments?: Array<{ organizationId: string; content: string }>;
}>(post: T) {
  const media = await createCommunityImageSignedUrls(getPostMedia(post.media));
  const comments = post.comments?.map((comment: any) => ({
    ...comment,
    content: decryptNullableString(comment.content, `communityPostComment:${comment.organizationId}:content`) ?? comment.content
  }));

  return {
    ...post,
    title: decryptNullableString(post.title, `communityPost:${post.organizationId}:title`) ?? post.title,
    content: decryptNullableString(post.content, `communityPost:${post.organizationId}:content`) ?? post.content,
    comments,
    media
  };
}

export async function listCommunityFeed(organizationId: string, userId: string, scope: CommunityPostScope) {
  await enforceSubscriptionCapability(organizationId, "communityFeed");

    let resolvedValue0: any;
  if (scope === CommunityPostScope.GLOBAL) {
    resolvedValue0 = { scope };
  } else {
    resolvedValue0 = { organizationId, scope: CommunityPostScope.ORGANIZATION };
  }
const posts = await db.communityPost.findMany({
    where: resolvedValue0,
    include: {
      ...communityPostInclude,
      likes: {
        where: {
          userId
        },
        select: {
          userId: true
        }
      }
    },
    orderBy: [
      { createdAt: "desc" }
    ],
    take: 50
  });

  return Promise.all(posts.map(async (post: any) => ({
    ...await hydrateCommunityPost(post),
    viewerHasLiked: post.likes.length > 0,
    likes: undefined
  })));
}

export async function getCommunityRanking(organizationId: string, scope: CommunityPostScope) {
  await enforceSubscriptionCapability(organizationId, "communityRanking");
    let resolvedValue1: any;
  if (scope === CommunityPostScope.GLOBAL) {
    resolvedValue1 = { scope };
  } else {
    resolvedValue1 = { organizationId, scope: CommunityPostScope.ORGANIZATION };
  }
const where = resolvedValue1;

  const contributors = await db.communityPost.groupBy({
    by: ["authorId"],
    where,
    _count: {
      _all: true
    },
    _sum: {
      likeCount: true
    },
    orderBy: {
      _sum: {
        likeCount: "desc"
      }
    },
    take: 10
  });

    let resolvedValue2: any;
  if (contributors.length > 0) {
    resolvedValue2 = await db.user.findMany({
        where: {
          id: {
            in: contributors.map((item: any) => item.authorId)
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      });
  } else {
    resolvedValue2 = [];
  }
const users = resolvedValue2 as Array<{ id: string; name: string | null; email: string | null; image: string | null }>;
  const userById = new Map(users.map((user: any) => [user.id, user]));
  const topPosts = await db.communityPost.findMany({
    where,
    include: communityPostInclude,
    orderBy: [
      { likeCount: "desc" },
      { createdAt: "desc" }
    ],
    take: 5
  });

  return {
    contributors: contributors.map((item, index) => {
      const user = userById.get(item.authorId);
      const postsCount = item._count._all;
      const likesReceived = item._sum.likeCount ?? 0;

      return {
        rank: index + 1,
        authorId: item.authorId,
        authorName: user?.name || user?.email || "Unknown member",
        authorImage: user?.image ?? null,
        postsCount,
        likesReceived,
        score: postsCount * 3 + likesReceived * 5
      };
    }),
    topPosts: await Promise.all(topPosts.map(hydrateCommunityPost))
  };
}

export async function createCommunityPost(params: {
  organizationId: string;
  workspaceId: string;
  authorId: string;
  title: string;
  content: string;
  scope?: CommunityPostScope;
  priority?: CommunityPostPriority;
  type?: CommunityPostType;
  projectId?: string | null;
  tags?: string[];
  mediaFiles?: File[];
}) {
  await enforceSubscriptionCapability(params.organizationId, "communityFeed");
  const scope = params.scope ?? CommunityPostScope.ORGANIZATION;
    let resolvedValue3: any;
  if (scope === CommunityPostScope.GLOBAL) {
    resolvedValue3 = null;
  } else {
    resolvedValue3 = params.projectId ?? null;
  }
const projectId = resolvedValue3;

  if (projectId) {
    await db.project.findFirstOrThrow({
      where: {
        id: projectId,
        organizationId: params.organizationId
      }
    });
  }

  let post = await db.communityPost.create({
    data: {
      organizationId: params.organizationId,
      workspaceId: params.workspaceId,
      authorId: params.authorId,
      scope,
      priority: params.priority ?? CommunityPostPriority.NORMAL,
      title: encryptNullableString(params.title.trim(), `communityPost:${params.organizationId}:title`) ?? "",
      content: encryptNullableString(params.content.trim(), `communityPost:${params.organizationId}:content`) ?? "",
      type: params.type ?? CommunityPostType.GENERAL,
      projectId,
      tags: params.tags ?? [],
      media: []
    },
    include: communityPostInclude
  });

  if (params.mediaFiles?.length) {
    try {
      const media = await uploadCommunityImages({
        organizationId: params.organizationId,
        postId: post.id,
        files: params.mediaFiles
      });

      post = await db.communityPost.update({
        where: {
          id: post.id
        },
        data: {
          media
        },
        include: communityPostInclude
      });
    } catch (error) {
      await db.communityPost.delete({
        where: {
          id: post.id
        }
      });

      throw error;
    }
  }

  await notifyOrganizationDiscordWebhook(params.organizationId, {
    content: "A new community post was published in Neolytics.",
    embeds: [
      {
        title: "Community update",
        description: "Abra a Neolytics para revisar a postagem interna.",
        color: 3978097,
        fields: [
          {
            name: "Category",
            value: post.type,
            inline: true
          },
          {
            name: "Author",
            value: post.author.name || post.author.email || "Unknown member",
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  });

  return hydrateCommunityPost(post);
}

export async function deleteCommunityPost(params: {
  organizationId: string;
  userId: string;
  postId: string;
  canManage: boolean;
}) {
  await enforceSubscriptionCapability(params.organizationId, "communityFeed");

  const post = await db.communityPost.findFirstOrThrow({
    where: {
      id: params.postId,
      OR: [
        { organizationId: params.organizationId },
        { scope: CommunityPostScope.GLOBAL }
      ]
    }
  });

  if (post.authorId !== params.userId && !(post.organizationId === params.organizationId && params.canManage)) {
    throw new Error("Você só pode excluir seus próprios posts da comunidade.");
  }

  await db.communityPost.delete({
    where: {
      id: post.id
    }
  });
  await deleteCommunityImages(getPostMedia(post.media));

  return { id: post.id };
}

export async function toggleCommunityPostLike(params: {
  organizationId: string;
  userId: string;
  postId: string;
}) {
  await enforceSubscriptionCapability(params.organizationId, "communityFeed");

  const post = await db.communityPost.findFirstOrThrow({
    where: {
      id: params.postId,
      OR: [
        { organizationId: params.organizationId },
        { scope: CommunityPostScope.GLOBAL }
      ]
    }
  });
  const existing = await db.communityPostLike.findUnique({
    where: {
      postId_userId: {
        postId: post.id,
        userId: params.userId
      }
    }
  });

  if (existing) {
    await db.$transaction([
      db.communityPostLike.delete({
        where: {
          postId_userId: {
            postId: post.id,
            userId: params.userId
          }
        }
      }),
      db.communityPost.update({
        where: {
          id: post.id
        },
        data: {
          likeCount: {
            decrement: 1
          }
        }
      })
    ]);

    return { liked: false };
  }

  await db.$transaction([
    db.communityPostLike.create({
      data: {
        postId: post.id,
        userId: params.userId
      }
    }),
    db.communityPost.update({
      where: {
        id: post.id
      },
      data: {
        likeCount: {
          increment: 1
        }
      }
    })
  ]);

  return { liked: true };
}

export async function createCommunityPostComment(params: {
  organizationId: string;
  userId: string;
  postId: string;
  content: string;
}) {
  await enforceSubscriptionCapability(params.organizationId, "communityFeed");

  const post = await db.communityPost.findFirstOrThrow({
    where: {
      id: params.postId,
      OR: [
        { organizationId: params.organizationId },
        { scope: CommunityPostScope.GLOBAL }
      ]
    }
  });

  const comment = await db.communityPostComment.create({
    data: {
      postId: post.id,
      organizationId: params.organizationId,
      authorId: params.userId,
      content: encryptNullableString(params.content.trim(), `communityPostComment:${params.organizationId}:content`) ?? ""
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      }
    }
  });

  return {
    ...comment,
    content: decryptNullableString(comment.content, `communityPostComment:${comment.organizationId}:content`) ?? comment.content
  };
}

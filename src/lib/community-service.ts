import { CommunityPostType, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { notifyOrganizationDiscordWebhook } from "@/lib/discord";
import { decryptNullableString, encryptNullableString } from "@/lib/security/encryption";
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
  }
} satisfies Prisma.CommunityPostInclude;

function decryptCommunityPost<T extends { organizationId: string; title: string; content: string }>(post: T) {
  return {
    ...post,
    title: decryptNullableString(post.title, `communityPost:${post.organizationId}:title`) ?? post.title,
    content: decryptNullableString(post.content, `communityPost:${post.organizationId}:content`) ?? post.content
  };
}

export async function listCommunityFeed(organizationId: string, userId: string) {
  await enforceSubscriptionCapability(organizationId, "communityFeed");

  const posts = await db.communityPost.findMany({
    where: {
      organizationId
    },
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

  return posts.map((post) => ({
    ...decryptCommunityPost(post),
    viewerHasLiked: post.likes.length > 0,
    likes: undefined
  }));
}

export async function getCommunityRanking(organizationId: string) {
  await enforceSubscriptionCapability(organizationId, "communityRanking");

  const contributors = await db.communityPost.groupBy({
    by: ["authorId"],
    where: {
      organizationId
    },
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

  const users = contributors.length > 0
    ? await db.user.findMany({
        where: {
          id: {
            in: contributors.map((item) => item.authorId)
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      })
    : [];
  const userById = new Map(users.map((user) => [user.id, user]));
  const topPosts = await db.communityPost.findMany({
    where: {
      organizationId
    },
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
    topPosts: topPosts.map(decryptCommunityPost)
  };
}

export async function createCommunityPost(params: {
  organizationId: string;
  workspaceId: string;
  authorId: string;
  title: string;
  content: string;
  type?: CommunityPostType;
  projectId?: string | null;
  tags?: string[];
}) {
  await enforceSubscriptionCapability(params.organizationId, "communityFeed");

  if (params.projectId) {
    await db.project.findFirstOrThrow({
      where: {
        id: params.projectId,
        organizationId: params.organizationId
      }
    });
  }

  const post = await db.communityPost.create({
    data: {
      organizationId: params.organizationId,
      workspaceId: params.workspaceId,
      authorId: params.authorId,
      title: encryptNullableString(params.title.trim(), `communityPost:${params.organizationId}:title`) ?? "",
      content: encryptNullableString(params.content.trim(), `communityPost:${params.organizationId}:content`) ?? "",
      type: params.type ?? CommunityPostType.GENERAL,
      projectId: params.projectId ?? null,
      tags: params.tags ?? []
    },
    include: communityPostInclude
  });

  await notifyOrganizationDiscordWebhook(params.organizationId, {
    content: "A new community post was published in Neolytics.",
    embeds: [
      {
        title: "Community update",
        description: "Open Neolytics to review the internal post.",
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

  return post;
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
      organizationId: params.organizationId
    }
  });

  if (post.authorId !== params.userId && !params.canManage) {
    throw new Error("You can only delete your own community posts.");
  }

  await db.communityPost.delete({
    where: {
      id: post.id
    }
  });

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
      organizationId: params.organizationId
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

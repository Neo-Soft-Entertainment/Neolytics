"use client";

import { CommunityPostPriority, CommunityPostScope, CommunityPostType } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export interface CommunityPostItem {
  id: string;
  title: string;
  content: string;
  scope: CommunityPostScope;
  priority: CommunityPostPriority;
  type: CommunityPostType;
  tags: string[] | null;
  likeCount: number;
  viewerHasLiked: boolean;
  canDelete?: boolean;
  createdAt: string;
  media: Array<{
    storagePath: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    signedUrl?: string;
  }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }>;
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  project: {
    id: string;
    name: string;
    stage: "DISCOVERY" | "PRE_PRODUCTION" | "PRODUCTION" | "LIVE" | "ARCHIVED";
  } | null;
}

export interface CommunityRankingResponse {
  contributors: Array<{
    rank: number;
    authorId: string;
    authorName: string;
    authorImage: string | null;
    postsCount: number;
    likesReceived: number;
    score: number;
  }>;
  topPosts: CommunityPostItem[];
}

export interface CommunityResponse {
  feed: CommunityPostItem[];
  ranking: CommunityRankingResponse;
}

export function useCommunity(enabled = true, scope: CommunityPostScope = CommunityPostScope.ORGANIZATION) {
  return useQuery({
    queryKey: ["community", scope],
    queryFn: () => apiClient<CommunityResponse>(`/api/community?scope=${scope}`),
    enabled
  });
}

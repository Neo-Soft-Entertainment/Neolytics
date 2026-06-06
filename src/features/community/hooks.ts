"use client";

import { CommunityPostType } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export interface CommunityPostItem {
  id: string;
  title: string;
  content: string;
  type: CommunityPostType;
  tags: string[] | null;
  likeCount: number;
  viewerHasLiked: boolean;
  createdAt: string;
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

export function useCommunity(enabled = true) {
  return useQuery({
    queryKey: ["community"],
    queryFn: () => apiClient<CommunityResponse>("/api/community"),
    enabled
  });
}

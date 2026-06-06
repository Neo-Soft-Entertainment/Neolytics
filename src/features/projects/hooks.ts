"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export interface ProjectListItem {
  id: string;
  name: string;
  slug: string;
  elevatorPitch: string | null;
  stage: "DISCOVERY" | "PRE_PRODUCTION" | "PRODUCTION" | "LIVE" | "ARCHIVED";
  createdAt: string;
  analysis: {
    competitionCount: number;
    averageReviewScore: number | null;
    medianRevenueCents: number | null;
  } | null;
  gdds: Array<{
    id: string;
    version: number;
  }>;
}

export interface ProjectDetailResponse extends ProjectListItem {
  description: string | null;
  genreInput: string | null;
  tagInput: string | null;
  targetAudience: string | null;
  coreLoop: string | null;
  differentiator: string | null;
  monetizationModel: string | null;
  artDirection: string | null;
  playerFantasy: string | null;
  pricePointCents: number | null;
  analysis: {
    analyzedAt: string;
    matchingGamesCount: number;
    competitionCount: number;
    releaseMomentum: number;
    averageReviewScore: number | null;
    averagePriceCents: number | null;
    medianRevenueCents: number | null;
    marketSummary: string;
    opportunitySummary: string;
    riskSummary: string;
    audienceAutofill: string | null;
    coreLoopAutofill: string | null;
    suggestedGenres: string[] | null;
    suggestedTags: string[] | null;
    differentiators: string[] | null;
  } | null;
  competitorGames: Array<{
    steamGame: {
      id: string;
      appId: number;
      name: string;
      reviewScore: number | null;
      reviewCount: number | null;
      priceCurrent: {
        finalPriceCents: number | null;
      } | null;
      revenueEstimates: Array<{
        medianNetRevenueCents: number;
      }>;
    };
  }>;
  gdds: Array<{
    id: string;
    version: number;
    title: string;
    content: string;
    updatedAt: string;
  }>;
  kanbanBoards: Array<{
    id: string;
    name: string;
    columns: Array<{
      id: string;
      name: string;
      color: string | null;
      sortOrder: number;
      cards: Array<{
        id: string;
        title: string;
        description: string | null;
        assigneeLabel: string | null;
        dueDate: string | null;
        labels: string[] | null;
        sortOrder: number;
      }>;
    }>;
  }>;
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => apiClient<ProjectListItem[]>("/api/projects")
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => apiClient<ProjectDetailResponse>(`/api/projects/${projectId}`),
    enabled: Boolean(projectId)
  });
}

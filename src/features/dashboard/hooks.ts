"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiClient<{
      marketOverview: {
        totalGames: number;
        averageReviewScore: number;
        trackedGamesCount: number;
      };
      trackedGames: Array<{
        id: string;
        steamGame: {
          appId: number;
          name: string;
          reviewCount: number | null;
        };
      }>;
      recentLaunches: Array<{
        id: string;
        appId: number;
        name: string;
        releaseDate: string | null;
      }>;
      topRevenue: Array<{
        id: string;
        medianNetRevenueCents: number;
        steamGame: {
          id: string;
          appId: number;
          name: string;
        };
      }>;
      fastestGrowing: Array<{
        id: string;
        appId: number;
        name: string;
        reviewCount: number | null;
      }>;
    }>("/api/dashboard")
  });
}

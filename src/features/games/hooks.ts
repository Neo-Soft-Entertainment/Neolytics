"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export interface GameListItem {
  id: string;
  appId: number;
  name: string;
  reviewScore: number | null;
  reviewCount: number | null;
  priceCurrent: {
    finalPriceCents: number | null;
  } | null;
  genres: Array<{
    steamGenre: {
      name: string;
    };
  }>;
}

export interface GameSearchResponse {
  items: GameListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GameDetailResponse extends GameListItem {
  shortDescription: string | null;
  currentPlayers: number | null;
  developers: Array<{
    steamDeveloper: {
      name: string;
    };
  }>;
  publishers: Array<{
    steamPublisher: {
      name: string;
    };
  }>;
  salesEstimates: Array<{
    lowEstimate: number;
    medianEstimate: number;
    highEstimate: number;
    confidence: string;
    explanation: string;
  }>;
  revenueEstimates: Array<{
    lowNetRevenueCents: number;
    medianNetRevenueCents: number;
    highNetRevenueCents: number;
    confidence: string;
    explanation: string;
  }>;
}

export interface SnapshotPoint {
  snapshotDate: string;
}

export interface PriceHistoryPoint extends SnapshotPoint {
  finalPriceCents: number | null;
}

export interface ReviewHistoryPoint extends SnapshotPoint {
  totalReviews: number;
}

export interface PlayerHistoryPoint extends SnapshotPoint {
  currentPlayers: number;
}

export interface EstimateResponse {
  salesEstimate: {
    medianEstimate: number;
  } | null;
  revenueEstimate: {
    medianNetRevenueCents: number;
  } | null;
}

export function useGameSearch(queryString: string) {
  return useQuery({
    queryKey: ["games", "search", queryString],
    queryFn: () => apiClient<GameSearchResponse>(`/api/games/search?${queryString}`),
    staleTime: 1000 * 60 * 2
  });
}

export function useGameDetails(appId: number) {
  return useQuery({
    queryKey: ["games", appId, "details"],
    queryFn: () => apiClient<GameDetailResponse>(`/api/games/${appId}`)
  });
}

export function useGameHistory(appId: number) {
  return useQuery({
    queryKey: ["games", appId, "history"],
    queryFn: async () => {
      const [priceHistory, reviewHistory, playerHistory, estimates] = await Promise.all([
        apiClient<PriceHistoryPoint[]>(`/api/games/${appId}/price-history`),
        apiClient<ReviewHistoryPoint[]>(`/api/games/${appId}/review-history`),
        apiClient<PlayerHistoryPoint[]>(`/api/games/${appId}/player-history`),
        apiClient<EstimateResponse>(`/api/games/${appId}/estimates`)
      ]);

      return {
        priceHistory,
        reviewHistory,
        playerHistory,
        estimates
      };
    }
  });
}

export function useCompareGames(appIds: number[]) {
  return useQuery({
    queryKey: ["compare", appIds],
    queryFn: () => apiClient<GameDetailResponse[]>(`/api/compare?appIds=${appIds.join(",")}`),
    enabled: appIds.length >= 2
  });
}

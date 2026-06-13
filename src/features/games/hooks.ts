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
  steamSync: {
    source: string;
    query: string | null;
    offset?: number;
    requested: number;
    synced: number;
    skipped: number;
    failed: number;
    appIds: number[];
  } | null;
}

export interface GameDetailResponse extends GameListItem {
  shortDescription: string | null;
  currentPlayers: number | null;
  steamXrayAccess: {
    label: string;
    historyLimit: number;
    playerHistoryAvailable: boolean;
    rawSnapshotsBetaAvailable: boolean;
  };
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
  currentPlayers?: number | null;
  reviewScore?: number | null;
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

export interface SteamDatabaseProfile {
  appId: number;
  name: string;
  classification: string;
  opportunityScore: number;
  confidenceLevel: string;
  dataQuality: {
    score: number;
    priceSnapshots: number;
    reviewSnapshots: number;
    playerSnapshots: number;
    peerDatasetSize: number;
    lastIngestedAt: string | null;
  };
  weightedFactors: Array<{
    name: string;
    score: number;
    weight: number;
    evidence: string;
  }>;
  marketSignals: {
    genreSaturation: string;
    growthRatio: number;
    releaseMomentum?: string;
    reviewVelocity30: {
      absoluteChange: number;
      relativeChangePercent: number | null;
    } | null;
    playerVelocity30: {
      absoluteChange: number;
      relativeChangePercent: number | null;
    } | null;
  };
  observedHistory: {
    price: {
      lowestObservedPriceCents: number | null;
      highestObservedPriceCents: number | null;
      discountSnapshotCount: number;
    };
    players: {
      peakObservedPlayers: number | null;
      averageObservedPlayers: number | null;
    };
  };
  competitiveIntelligence: {
    directCompetitors: Array<{
      appId: number;
      name: string;
      reviewCount: number | null;
      reviewScore: number | null;
      estimatedMedianNetRevenueCents: number | null;
    }>;
    recentSuccessfulLaunches: Array<{
      appId: number;
      name: string;
      releaseDate: string | null;
      reviewCount: number | null;
      reviewScore: number | null;
    }>;
    weakSimilarLaunches: Array<{
      appId: number;
      name: string;
      releaseDate: string | null;
      reviewCount: number | null;
      reviewScore: number | null;
    }>;
  };
  trendDetection: {
    releaseMomentum: string;
    explanation: string;
    emergingTags: Array<{
      name: string;
      recentSharePercent: number;
      datasetSharePercent: number;
    }>;
  };
  sources: string[];
  evidenceTrail: string[];
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

export function useGameHistory(appId: number, enabled = true) {
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
    },
    enabled
  });
}

export function useGameSnapshots(appId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["games", appId, "snapshots"],
    queryFn: () => apiClient<SnapshotPoint[]>(`/api/games/${appId}/snapshots`),
    enabled
  });
}

export function useGameDatabaseProfile(appId: number, enabled = true) {
  return useQuery({
    queryKey: ["games", appId, "database-profile"],
    queryFn: () => apiClient<SteamDatabaseProfile>(`/api/games/${appId}/database-profile`),
    enabled
  });
}

export function useCompareGames(appIds: number[]) {
  return useQuery({
    queryKey: ["compare", appIds],
    queryFn: () => apiClient<GameDetailResponse[]>(`/api/compare?appIds=${appIds.join(",")}`),
    enabled: appIds.length >= 2
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export type DashboardSummary = {
  planLabel: string;
  canAccessFinanceWorkspace: boolean;
  marketOverview: {
    totalGames: number;
    averageReviewScore: number;
    trackedGamesCount: number;
  };
  portfolioReadiness: {
    averageOpportunityScore: number;
    averageRiskScore: number;
    averageFitScore: number;
    topThesis: {
      projectId: string;
      projectName: string;
      stage: string;
      opportunityScore: number | null;
      riskScore: number | null;
      fitScore: number | null;
      confidenceScore: number | null;
    } | null;
  } | null;
  financeSnapshot: {
    netCashCents: number;
    pendingRevenueCents: number;
    pendingExpenseCents: number;
    activeBudgetsCount: number;
  };
  projectSignalsCount: number;
  recentLaunchesCount: number;
};

export type DashboardDetails = {
  projectSignals: Array<{
    projectId: string;
    projectName: string;
    stage: string;
    opportunityScore: number | null;
    riskScore: number | null;
    fitScore: number | null;
    confidenceScore: number | null;
  }>;
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
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiClient<DashboardSummary>("/api/dashboard")
  });
}

export function useDashboardDetails(enabled: boolean) {
  return useQuery({
    queryKey: ["dashboard", "details"],
    queryFn: () => apiClient<DashboardDetails>("/api/dashboard/details"),
    enabled
  });
}

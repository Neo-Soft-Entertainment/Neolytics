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
      guidedJourney: {
        completedSteps: number;
        totalSteps: number;
        progressPercent: number;
        nextStep: {
          id: string;
          title: string;
          description: string;
          href: string;
          completed: boolean;
        } | null;
        steps: Array<{
          id: string;
          title: string;
          description: string;
          href: string;
          completed: boolean;
        }>;
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
    }>("/api/dashboard")
  });
}

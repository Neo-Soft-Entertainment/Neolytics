"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export interface OpportunityItem {
  appId: number;
  name: string;
  score: number;
  reviewScore: number | null;
  competitionCount: number;
  medianNetRevenueCents: number;
  priceCents: number;
  riskScore: number;
  revenuePotentialScore: number;
  underservedScore: number;
  executionBarScore: number;
  confidenceScore: number;
  marketSizeLabel: string;
  premiumSharePercent: number;
  launchDensityScore: number;
}

export function useOpportunities() {
  return useQuery({
    queryKey: ["opportunities"],
    queryFn: () => apiClient<OpportunityItem[]>("/api/opportunities")
  });
}

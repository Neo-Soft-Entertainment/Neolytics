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
  assigneeOptions: Array<{
    id: string;
    label: string;
    email: string;
    image: string | null;
  }>;
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
    metadata: {
      topCompetitorIds?: string[];
      topCompetitorNames?: string[];
      marketDepth?: {
        marketSizeCents: number;
        marketSizeLabel: string;
        reviewVelocity90: number;
        previousReviewVelocity90: number;
        playerMomentum30: number;
        previousPlayerMomentum30: number;
        priceBandDistribution: {
          under10: number;
          between10And20: number;
          between20And30: number;
          over30: number;
        };
        launchCohorts: {
          last90Days: number;
          last180Days: number;
          last365Days: number;
        };
        revenueConcentrationPercent: number;
        confidenceScore: number;
        confidenceLabel: string;
      };
      competitionLayer?: {
        directComparableCount: number;
        adjacentComparableCount: number;
        crowdednessScore: number;
        winnerConcentrationScore: number;
        qualityBarScore: number;
        dominantMonetization: string;
        premiumSharePercent: number;
        directComparableNames: string[];
        adjacentComparableNames: string[];
      };
      opportunityLayer?: {
        underservedScore: number;
        revenuePotentialScore: number;
        opportunityScore: number;
        riskScore: number;
        executionBarScore: number;
        practicalRecommendations: string[];
        keyMismatches: string[];
      };
      projectFitLayer?: {
        genreTagCoverageScore: number;
        priceFitScore: number;
        monetizationFitScore: number;
        positioningClarityScore: number;
        overallFitScore: number;
      };
      hybridMarketIntelligence?: {
        sourceModel: string;
        aiDependency: string;
        sourcesUsed: string[];
        dataQuality: {
          score: number;
          label: string;
          coverage: Record<string, number>;
          limitations: string[];
        };
        probabilisticAssessment: {
          classification: string;
          confidenceLevel: string;
          confidenceScore: number;
          probabilities: {
            commercialOpportunity: number;
            nicheDemand: number;
            oversaturation: number;
            executionRisk: number;
            growthPotential: number;
            discoverabilityDifficulty: number;
          };
          conclusion: string;
        };
        opportunityScoring: {
          score: number;
          label: string;
          commercialOpportunityScore: number;
          riskScore: number;
          factors: Array<{
            name: string;
            score: number;
            weight: number;
            justification: string;
            metrics: Record<string, string | number>;
          }>;
        };
        demandModel: {
          demandScore: number;
          audienceSizeScore: number;
          marketMomentumScore: number;
          revenuePotentialRange: {
            lowCents: number;
            medianCents: number;
            highCents: number;
          };
          wishlistProxy: {
            score: number;
            basis: string;
          };
          reasoning: string;
        };
        competitiveIntelligence: {
          directCompetitors: Array<{ name: string; appId: number; similarityScore: number; reviewScore: number | null; reviewCount: number | null; medianRevenueCents: number }>;
          adjacentCompetitors: Array<{ name: string; appId: number; similarityScore: number; reviewScore: number | null; reviewCount: number | null; medianRevenueCents: number }>;
          marketLeaders: Array<{ name: string; appId: number; similarityScore: number; reviewScore: number | null; reviewCount: number | null; medianRevenueCents: number }>;
          fastGrowingGames: Array<{ name: string; appId: number; similarityScore: number; reviewScore: number | null; reviewCount: number | null; medianRevenueCents: number }>;
          recentlySuccessfulLaunches: Array<{ name: string; appId: number; similarityScore: number; reviewScore: number | null; reviewCount: number | null; medianRevenueCents: number }>;
          failedLaunches: Array<{ name: string; appId: number; similarityScore: number; reviewScore: number | null; reviewCount: number | null; medianRevenueCents: number }>;
        };
        trendDetection: {
          risingGenres: Array<{ trend: string; strengthScore: number; explanation: string }>;
          emergingTags: Array<{ tag: string; strengthScore: number; explanation: string }>;
          decliningSignals: Array<{ signal: string; score: number; explanation: string }>;
          seasonalOpportunities: Array<{ window: string; confidence: string; explanation: string }>;
          underservedNiches: Array<{ niche: string; confidence: string; explanation: string }>;
          marketShiftExplanation: string;
        };
        evidenceTrail: Array<{
          claim: string;
          support: string;
          sources: string[];
        }>;
      };
      aiLayer?: {
        marketSummary: string;
        opportunitySummary: string;
        riskSummary: string;
        audienceAutofill: string;
        coreLoopAutofill: string;
        strategicNarrative: string;
        positioningSummary: string;
        launchStrategy: string;
        pricingNarrative: string;
        storeCapsuleAdvice: string;
        confidenceNarrative: string;
        creativeAngles: string[];
        acquisitionChannels: string[];
        wishlistDrivers: string[];
        redFlags: string[];
      };
    } | null;
  } | null;
  artAnalysis: {
    analyzedAt: string;
    distinctivenessScore: number;
    productionComplexityScore: number;
    marketFitScore: number;
    visualTrendScore: number;
    styleSummary: string;
    fitSummary: string;
    productionSummary: string;
    recommendationSummary: string;
    paletteKeywords: string[] | null;
    moodKeywords: string[] | null;
    metadata: {
      referenceGameIds?: string[];
      referenceGameNames?: string[];
    } | null;
  } | null;
  artAssets: Array<{
    id: string;
    kind: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    visualMetrics: {
      brightness: number;
      contrast: number;
      saturation: number;
      colorfulness: number;
      edgeDensity: number;
      dominantColor: string;
      readabilityScore: number;
      legibilityRisk: "low" | "medium" | "high";
      analysisSource: string;
    } | null;
    notes: string | null;
    signedUrl: string | null;
    createdAt: string;
  }>;
  competitorGames: Array<{
    steamGame: {
      id: string;
      appId: number;
      name: string;
      headerImageUrl: string | null;
      capsuleImageUrl: string | null;
      reviewScore: number | null;
      reviewCount: number | null;
      priceCurrent: {
        finalPriceCents: number | null;
      } | null;
      revenueEstimates: Array<{
        medianNetRevenueCents: number;
      }>;
      genres: Array<{
        steamGenre: {
          name: string;
        };
      }>;
      tags: Array<{
        steamTag: {
          name: string;
        };
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
  milestones: Array<{
    id: string;
    title: string;
    description: string | null;
    ownerLabel: string | null;
    status: "PLANNED" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
    dueAt: string | null;
    completedAt: string | null;
    budgetedCostCents: number;
    expectedRevenueCents: number;
    sortOrder: number;
  }>;
  budgets: Array<{
    id: string;
    name: string;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    totalPlannedCents: number;
    lines: Array<{
      id: string;
      category: string;
      plannedCents: number;
      actualCents: number;
    }>;
  }>;
  revenueEntries: Array<{
    id: string;
    sourceName: string;
    status: "PLANNED" | "PENDING" | "PAID" | "RECEIVED" | "CANCELED";
    netCents: number;
    receivedAt: string;
  }>;
  expenseEntries: Array<{
    id: string;
    vendorName: string;
    status: "PLANNED" | "PENDING" | "PAID" | "RECEIVED" | "CANCELED";
    amountCents: number;
    occurredAt: string;
  }>;
  approvalRequests: Array<{
    id: string;
    entityType: string;
    entityId: string;
    actionLabel: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";
    amountCents: number | null;
    reason: string | null;
    createdAt: string;
    decidedAt: string | null;
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

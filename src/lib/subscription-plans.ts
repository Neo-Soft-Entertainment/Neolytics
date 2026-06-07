import { SubscriptionPlan } from "@prisma/client";

export type SubscriptionMetric =
  | "seats"
  | "workspaces"
  | "savedGames"
  | "competitorSets"
  | "projects"
  | "reportsGenerated"
  | "exportsGenerated"
  | "projectAnalysesRun"
  | "gddsGenerated"
  | "artAnalysesRun";

export type SubscriptionCapability =
  | "steamRadar"
  | "marketResearch"
  | "revenueCalculator"
  | "communityFeed"
  | "steamXray"
  | "viabilityAnalyses"
  | "artAnalyses"
  | "gameBoardProjects"
  | "gdds"
  | "communityRanking"
  | "guidedJourney"
  | "pdfExport"
  | "earlyAccess";

export const subscriptionFeatureRows: Array<{
  key: SubscriptionCapability;
  label: string;
}> = [
  { key: "steamRadar", label: "Steam Radar" },
  { key: "marketResearch", label: "Market Research" },
  { key: "revenueCalculator", label: "Revenue Calculator" },
  { key: "communityFeed", label: "Community Feed" },
  { key: "steamXray", label: "Steam X-Ray" },
  { key: "viabilityAnalyses", label: "Viability Analyses" },
  { key: "artAnalyses", label: "Art Analyses" },
  { key: "gameBoardProjects", label: "Game Board Projects" },
  { key: "gdds", label: "GDDs" },
  { key: "communityRanking", label: "Community Ranking" },
  { key: "guidedJourney", label: "Guided Journey" },
  { key: "pdfExport", label: "PDF Export" },
  { key: "earlyAccess", label: "Early Access to New Features" }
];

export const subscriptionTruthNotes = [
  "Steam Radar, Market Research, Revenue Calculator, and Guided Journey are live across all plans today.",
  "Community access, Community Ranking, PDF Export, Art Analyses, Viability Analysis volume, GDD volume, Game Board project limits, and Steam X-Ray tiers are enforced in the product now.",
  "Early Access currently unlocks the raw Steam snapshot stream beta on Pro."
];

export const subscriptionPlans = {
  [SubscriptionPlan.FREE]: {
    label: "Free",
    priceLabel: "$0",
    description: "For solo exploration and early validation.",
    highlights: [
      "Steam Radar, market research, and revenue calculator",
      "Basic Steam X-Ray access",
      "1 seat and 1 workspace",
      "3 active Game Board projects",
      "10 viability analyses per month",
      "10 GDDs per month",
      "Guided onboarding journey"
    ],
    featureAccess: {
      steamRadar: "Included",
      marketResearch: "Included",
      revenueCalculator: "Included",
      communityFeed: "Not included",
      steamXray: "Basic access",
      viabilityAnalyses: "10 / month",
      artAnalyses: "Not included",
      gameBoardProjects: "3 active",
      gdds: "10 / month",
      communityRanking: "Not included",
      guidedJourney: "Included",
      pdfExport: "Not included",
      earlyAccess: "Not included"
    },
    limits: {
      seats: 1,
      workspaces: 1,
      savedGames: 25,
      competitorSets: 3,
      projects: 3,
      reportsGenerated: 5,
      exportsGenerated: 20,
      projectAnalysesRun: 10,
      gddsGenerated: 10,
      artAnalysesRun: 0
    }
  },
  [SubscriptionPlan.PLUS]: {
    label: "Plus",
    priceLabel: "$20",
    description: "For serious studios building a steady research workflow.",
    highlights: [
      "Community, ranking, and PDF export",
      "Advanced Steam X-Ray access",
      "5 seats and 5 workspaces",
      "20 active Game Board projects",
      "100 viability analyses per month",
      "100 GDDs per month"
    ],
    featureAccess: {
      steamRadar: "Included",
      marketResearch: "Included",
      revenueCalculator: "Included",
      communityFeed: "Included",
      steamXray: "Advanced access",
      viabilityAnalyses: "100 / month",
      artAnalyses: "25 / month",
      gameBoardProjects: "20 active",
      gdds: "100 / month",
      communityRanking: "Included",
      guidedJourney: "Included",
      pdfExport: "Included",
      earlyAccess: "Not included"
    },
    limits: {
      seats: 5,
      workspaces: 5,
      savedGames: 250,
      competitorSets: 25,
      projects: 20,
      reportsGenerated: 40,
      exportsGenerated: 150,
      projectAnalysesRun: 100,
      gddsGenerated: 100,
      artAnalysesRun: 25
    }
  },
  [SubscriptionPlan.PRO]: {
    label: "Pro",
    priceLabel: "$200",
    description: "For power users who want essentially unrestricted research velocity.",
    highlights: [
      "Unlimited Steam X-Ray history",
      "Unlimited viability analyses",
      "Unlimited Game Board projects",
      "Unlimited GDDs",
      "PDF export and priority beta access",
      "Unlimited seats and workspaces"
    ],
    featureAccess: {
      steamRadar: "Included",
      marketResearch: "Included",
      revenueCalculator: "Included",
      communityFeed: "Included",
      steamXray: "Unlimited",
      viabilityAnalyses: "Unlimited",
      artAnalyses: "Unlimited",
      gameBoardProjects: "Unlimited",
      gdds: "Unlimited",
      communityRanking: "Included",
      guidedJourney: "Included",
      pdfExport: "Included",
      earlyAccess: "Priority beta access"
    },
    limits: {
      seats: null,
      workspaces: null,
      savedGames: null,
      competitorSets: null,
      projects: null,
      reportsGenerated: null,
      exportsGenerated: null,
      projectAnalysesRun: null,
      gddsGenerated: null,
      artAnalysesRun: null
    }
  }
} as const;

export function getSubscriptionPlanConfig(plan: SubscriptionPlan) {
  return subscriptionPlans[plan];
}

export function getSubscriptionPlanLabel(plan: SubscriptionPlan) {
  return subscriptionPlans[plan].label;
}

export function formatSubscriptionLimit(limit: number | null) {
  if (limit === null) {
    return "Unlimited";
  }

  return limit.toLocaleString("en-US");
}

export function hasSubscriptionCapability(plan: SubscriptionPlan, capability: SubscriptionCapability) {
  const value = subscriptionPlans[plan].featureAccess[capability];
  return value !== "Not included";
}

export function getSteamXrayHistoryLimit(plan: SubscriptionPlan) {
  if (plan === SubscriptionPlan.FREE) {
    return 30;
  }

  if (plan === SubscriptionPlan.PLUS) {
    return 180;
  }

  return 365;
}

export function canAccessSteamXrayPlayerHistory(plan: SubscriptionPlan) {
  return plan !== SubscriptionPlan.FREE;
}

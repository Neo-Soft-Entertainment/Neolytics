import { SubscriptionPlan } from "@prisma/client";

export const subscriptionPlans = {
  [SubscriptionPlan.FREE]: {
    label: "Free",
    priceLabel: "$0",
    description: "For solo exploration and early validation.",
    features: [
      "1 workspace",
      "25 saved games",
      "3 competitor sets",
      "3 active projects",
      "5 reports per month",
      "20 exports per month"
    ],
    limits: {
      workspaces: 1,
      savedGames: 25,
      competitorSets: 3,
      projects: 3,
      reportsGenerated: 5,
      exportsGenerated: 20,
      projectAnalysesRun: 10,
      gddsGenerated: 10
    }
  },
  [SubscriptionPlan.PLUS]: {
    label: "Plus",
    priceLabel: "$20",
    description: "For serious studios building a steady research workflow.",
    features: [
      "5 workspaces",
      "250 saved games",
      "25 competitor sets",
      "20 active projects",
      "40 reports per month",
      "150 exports per month"
    ],
    limits: {
      workspaces: 5,
      savedGames: 250,
      competitorSets: 25,
      projects: 20,
      reportsGenerated: 40,
      exportsGenerated: 150,
      projectAnalysesRun: 100,
      gddsGenerated: 100
    }
  },
  [SubscriptionPlan.PRO]: {
    label: "Pro",
    priceLabel: "$200",
    description: "For power users who want essentially unrestricted research velocity.",
    features: [
      "Unlimited workspaces",
      "Unlimited saved games",
      "Unlimited competitor sets",
      "Unlimited active projects",
      "Unlimited reports and exports",
      "Unlimited project analysis and GDD generation"
    ],
    limits: {
      workspaces: null,
      savedGames: null,
      competitorSets: null,
      projects: null,
      reportsGenerated: null,
      exportsGenerated: null,
      projectAnalysesRun: null,
      gddsGenerated: null
    }
  }
} as const;

export type SubscriptionMetric =
  | "workspaces"
  | "savedGames"
  | "competitorSets"
  | "projects"
  | "reportsGenerated"
  | "exportsGenerated"
  | "projectAnalysesRun"
  | "gddsGenerated";

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

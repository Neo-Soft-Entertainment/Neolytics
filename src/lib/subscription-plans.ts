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
  { key: "steamRadar", label: "Radar Steam" },
  { key: "marketResearch", label: "Pesquisa de Mercado" },
  { key: "revenueCalculator", label: "Calculadora de Receita" },
  { key: "communityFeed", label: "Comunidade (Feed)" },
  { key: "steamXray", label: "Raio-X Steam" },
  { key: "viabilityAnalyses", label: "Análises de Viabilidade" },
  { key: "artAnalyses", label: "Análises de Artes" },
  { key: "gameBoardProjects", label: "Projetos no Game Board" },
  { key: "gdds", label: "GDDs" },
  { key: "communityRanking", label: "Ranking da Comunidade" },
  { key: "guidedJourney", label: "Jornada guiada" },
  { key: "pdfExport", label: "Exportação PDF" },
  { key: "earlyAccess", label: "Acesso Antecipado a novas funcionalidades" }
];

export const subscriptionPlans = {
  [SubscriptionPlan.FREE]: {
    label: "Free",
    priceLabel: "$0",
    description: "For solo exploration and early validation.",
    highlights: [
      "Radar Steam, pesquisa de mercado e calculadora de receita",
      "1 seat e 1 workspace",
      "3 projetos ativos no Game Board",
      "10 análises de viabilidade por mês",
      "10 GDDs por mês",
      "Jornada guiada para onboarding"
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
      "Comunidade, ranking e PDF export",
      "5 seats e 5 workspaces",
      "Raio-X Steam mais profundo",
      "20 projetos ativos no Game Board",
      "100 análises de viabilidade por mês",
      "100 GDDs por mês"
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
      "Raio-X Steam ilimitado",
      "Análises de viabilidade ilimitadas",
      "Projetos no Game Board ilimitados",
      "GDDs ilimitados",
      "PDF export e early access",
      "Seats e workspaces ilimitados"
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
      earlyAccess: "Included"
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

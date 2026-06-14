import { SubscriptionPlan } from "@prisma/client";

export type FeatureKey =
  | "radarSteam"
  | "marketResearch"
  | "revenueCalculator"
  | "communityFeed"
  | "communityRanking"
  | "pdfExport"
  | "earlyAccess"
  | "steamXray"
  | "viabilityAnalysis"
  | "artAnalysis"
  | "gameBoard"
  | "gdd";

export type LimitKey =
  | "steamXrayPerMonth"
  | "viabilityAnalysesPerMonth"
  | "artAnalysesPerMonth"
  | "gameBoardProjects"
  | "gdds";

export type LimitValue = number | "unlimited";

export type EntitlementPolicy = {
  features: Record<FeatureKey, boolean>;
  limits: Record<LimitKey, LimitValue>;
};

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
  | "pdfExport"
  | "commerceOps"
  | "financeWorkspace"
  | "companyHub"
  | "documentVault"
  | "contractsRoyalties"
  | "invoiceOps"
  | "approvalsAudit"
  | "earlyAccess";

export const subscriptionFeatureRows: Array<{
  key: SubscriptionCapability;
  label: string;
}> = [
  { key: "steamRadar", label: "Steam Radar" },
  { key: "marketResearch", label: "Pesquisa de mercado" },
  { key: "revenueCalculator", label: "Calculadora de receita" },
  { key: "communityFeed", label: "Feed da comunidade" },
  { key: "steamXray", label: "Steam X-Ray" },
  { key: "viabilityAnalyses", label: "Análises de viabilidade" },
  { key: "artAnalyses", label: "Análises de arte" },
  { key: "gameBoardProjects", label: "Projetos no quadro de jogos" },
  { key: "gdds", label: "GDDs" },
  { key: "communityRanking", label: "Ranking da comunidade" },
  { key: "pdfExport", label: "Exportação PDF" },
  { key: "commerceOps", label: "Operações comerciais" },
  { key: "financeWorkspace", label: "Workspace financeiro" },
  { key: "companyHub", label: "Hub da empresa" },
  { key: "documentVault", label: "Cofre de documentos" },
  { key: "contractsRoyalties", label: "Contratos e royalties" },
  { key: "invoiceOps", label: "Faturas e contas a pagar" },
  { key: "approvalsAudit", label: "Aprovações e auditoria" },
  { key: "earlyAccess", label: "Acesso antecipado a novos recursos" }
];

export const subscriptionTruthNotes = [
  "Steam Radar, Pesquisa de mercado, Calculadora de receita, Comunidade e Steam X-Ray estão ativos em todos os planos hoje.",
  "Exportação PDF, Análises de arte, volume de Análise de viabilidade, volume de GDD, limites de projetos no quadro e camadas de acesso ao ERP já são aplicados no produto.",
  "Operações comerciais, Workspace financeiro, Hub da empresa, Cofre de documentos, Contratos e royalties, Faturas e contas a pagar, e Aprovações e auditoria agora seguem acesso real por plano.",
  "Planos pagos começam com 7 dias de teste gratuito pela Stripe.",
  "Acesso antecipado libera atualmente o stream beta de snapshots brutos da Steam no Pro."
];

export const subscriptionPlans = {
  [SubscriptionPlan.FREE]: {
    label: "Free",
    priceLabel: "$0",
    description: "Para exploração solo e validação inicial.",
    highlights: [
      "Steam Radar, pesquisa de mercado e calculadora de receita",
      "Feed e ranking da comunidade",
      "Steam X-Ray incluído",
      "1 assento e 1 workspace",
      "3 projetos ativos no quadro de jogos",
      "10 análises de viabilidade por mês",
      "10 GDDs por mês"
    ],
    featureAccess: {
      steamRadar: "Incluído",
      marketResearch: "Incluído",
      revenueCalculator: "Incluído",
      communityFeed: "Incluído",
      steamXray: "Incluído",
      viabilityAnalyses: "10 / mês",
      artAnalyses: "Não incluído",
      gameBoardProjects: "3 ativos",
      gdds: "10 / mês",
      communityRanking: "Incluído",
      pdfExport: "Não incluído",
      commerceOps: "Não incluído",
      financeWorkspace: "Não incluído",
      companyHub: "Não incluído",
      documentVault: "Não incluído",
      contractsRoyalties: "Não incluído",
      invoiceOps: "Não incluído",
      approvalsAudit: "Não incluído",
      earlyAccess: "Não incluído"
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
    description: "Para estúdios sérios construindo um fluxo constante de pesquisa. Inclui 7 dias de teste gratuito.",
    highlights: [
      "7 dias de teste gratuito",
      "Comunidade, ranking e exportação PDF",
      "Steam X-Ray incluído",
      "Workspace financeiro, hub da empresa e cofre de documentos",
      "5 assentos e 5 workspaces",
      "20 projetos ativos no quadro de jogos",
      "100 análises de viabilidade por mês",
      "100 GDDs por mês"
    ],
    featureAccess: {
      steamRadar: "Incluído",
      marketResearch: "Incluído",
      revenueCalculator: "Incluído",
      communityFeed: "Incluído",
      steamXray: "Incluído",
      viabilityAnalyses: "100 / mês",
      artAnalyses: "25 / mês",
      gameBoardProjects: "20 ativos",
      gdds: "100 / mês",
      communityRanking: "Incluído",
      pdfExport: "Incluído",
      commerceOps: "Incluído",
      financeWorkspace: "Incluído",
      companyHub: "Incluído",
      documentVault: "Incluído",
      contractsRoyalties: "Não incluído",
      invoiceOps: "Não incluído",
      approvalsAudit: "Não incluído",
      earlyAccess: "Não incluído"
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
    description: "Para usuários avançados que querem velocidade de pesquisa praticamente irrestrita. Inclui 7 dias de teste gratuito.",
    highlights: [
      "7 dias de teste gratuito",
      "Steam X-Ray incluído",
      "Análises de viabilidade ilimitadas",
      "Projetos ilimitados no quadro de jogos",
      "Financeiro, empresa, contratos, faturas e aprovações",
      "GDDs ilimitados",
      "Exportação PDF e acesso beta prioritário",
      "Assentos e workspaces ilimitados"
    ],
    featureAccess: {
      steamRadar: "Incluído",
      marketResearch: "Incluído",
      revenueCalculator: "Incluído",
      communityFeed: "Incluído",
      steamXray: "Incluído",
      viabilityAnalyses: "Ilimitado",
      artAnalyses: "Ilimitado",
      gameBoardProjects: "Ilimitado",
      gdds: "Ilimitado",
      communityRanking: "Incluído",
      pdfExport: "Incluído",
      commerceOps: "Incluído",
      financeWorkspace: "Incluído",
      companyHub: "Incluído",
      documentVault: "Incluído",
      contractsRoyalties: "Incluído",
      invoiceOps: "Incluído",
      approvalsAudit: "Incluído",
      earlyAccess: "Acesso beta prioritário"
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
    return "Ilimitado";
  }

  return limit.toLocaleString("en-US");
}

export function hasSubscriptionCapability(plan: SubscriptionPlan, capability: SubscriptionCapability) {
  const value = subscriptionPlans[plan].featureAccess[capability];
  return value !== "Não incluído";
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

const featureCapabilityMap: Record<FeatureKey, SubscriptionCapability> = {
  radarSteam: "steamRadar",
  marketResearch: "marketResearch",
  revenueCalculator: "revenueCalculator",
  communityFeed: "communityFeed",
  communityRanking: "communityRanking",
  pdfExport: "pdfExport",
  earlyAccess: "earlyAccess",
  steamXray: "steamXray",
  viabilityAnalysis: "viabilityAnalyses",
  artAnalysis: "artAnalyses",
  gameBoard: "gameBoardProjects",
  gdd: "gdds"
};

export const limitLabels: Record<LimitKey, string> = {
  steamXrayPerMonth: "uso mensal do Steam X-Ray",
  viabilityAnalysesPerMonth: "uso mensal de análise de viabilidade",
  artAnalysesPerMonth: "uso mensal de análise de arte",
  gameBoardProjects: "uso de projetos no quadro de jogos",
  gdds: "uso de GDD"
};

export function getEntitlementPolicyForPlan(plan: SubscriptionPlan): EntitlementPolicy {
  const config = getSubscriptionPlanConfig(plan);
  const limitValue = (value: number | null): LimitValue => {
    let resolvedValue0: any;
    if (value === null) {
      resolvedValue0 = "unlimited";
    } else {
      resolvedValue0 = value;
    }
    return resolvedValue0;
  };

    let resolvedValue1: any;
  if (plan === SubscriptionPlan.PRO) {
    resolvedValue1 = "unlimited";
  } else {
        let resolvedValue3: any;
    if (plan === SubscriptionPlan.PLUS) {
      resolvedValue3 = 100;
    } else {
      resolvedValue3 = 10;
    }
resolvedValue1 = resolvedValue3;
  }
return {
    features: {
      radarSteam: hasSubscriptionCapability(plan, featureCapabilityMap.radarSteam),
      marketResearch: hasSubscriptionCapability(plan, featureCapabilityMap.marketResearch),
      revenueCalculator: hasSubscriptionCapability(plan, featureCapabilityMap.revenueCalculator),
      communityFeed: hasSubscriptionCapability(plan, featureCapabilityMap.communityFeed),
      communityRanking: hasSubscriptionCapability(plan, featureCapabilityMap.communityRanking),
      pdfExport: hasSubscriptionCapability(plan, featureCapabilityMap.pdfExport),
      earlyAccess: hasSubscriptionCapability(plan, featureCapabilityMap.earlyAccess),
      steamXray: hasSubscriptionCapability(plan, featureCapabilityMap.steamXray),
      viabilityAnalysis: hasSubscriptionCapability(plan, featureCapabilityMap.viabilityAnalysis),
      artAnalysis: hasSubscriptionCapability(plan, featureCapabilityMap.artAnalysis),
      gameBoard: hasSubscriptionCapability(plan, featureCapabilityMap.gameBoard),
      gdd: hasSubscriptionCapability(plan, featureCapabilityMap.gdd)
    },
    limits: {
      steamXrayPerMonth: resolvedValue1,
      viabilityAnalysesPerMonth: limitValue(config.limits.projectAnalysesRun),
      artAnalysesPerMonth: limitValue(config.limits.artAnalysesRun),
      gameBoardProjects: limitValue(config.limits.projects),
      gdds: limitValue(config.limits.gddsGenerated)
    }
  };
}

export function canPlanUseFeature(plan: SubscriptionPlan, featureKey: FeatureKey) {
  return getEntitlementPolicyForPlan(plan).features[featureKey];
}

export function getPlanLimit(plan: SubscriptionPlan, limitKey: LimitKey) {
  return getEntitlementPolicyForPlan(plan).limits[limitKey];
}

export function getLimitLabel(limit: LimitValue) {
    let resolvedValue2: any;
  if (limit === "unlimited") {
    resolvedValue2 = "Ilimitado";
  } else {
    resolvedValue2 = String(limit);
  }
return resolvedValue2;
}

export function hasReachedLimit(currentUsage: number, limit: LimitValue) {
  if (limit === "unlimited") {
    return false;
  }

  return currentUsage >= limit;
}

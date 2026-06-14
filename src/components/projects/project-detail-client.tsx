"use client";

import { SubscriptionPlan } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { ErrorState } from "@/components/error-state";
import { ExportActions } from "@/components/export/export-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ProjectKanbanBoard } from "@/components/projects/project-kanban-board";
import { DemoManagerPageClient } from "@/features/demo-manager/demo-manager-page-client";
import { useEntitlements, useUsage } from "@/features/entitlements/hooks";
import { ProjectAssigneeSelect } from "@/features/projects/components/project-assignee-select";
import { ProjectOverviewForm } from "@/features/projects/components/project-overview-form";
import { useProject } from "@/features/projects/hooks";
import {
  createProjectKanbanCard,
  createProjectKanbanColumn,
  createProjectMilestone,
  deleteProjectArtAsset,
  deleteProjectKanbanCard,
  deleteProjectKanbanColumn,
  generateProjectGdd,
  moveProjectKanbanCard,
  moveProjectKanbanCardInColumn,
  moveProjectKanbanColumn,
  reorderProjectKanbanCard,
  runProjectAnalysis,
  runProjectArtAnalysis,
  saveProjectKanbanCard,
  updateProjectKanbanColumn,
  saveProjectMilestone,
  saveProjectOverview,
  uploadProjectArtAsset
} from "@/features/projects/services/project-detail-api";
import type { ProjectOverviewFormState } from "@/features/projects/types";
import { getLimitLabel } from "@/lib/subscription-plans";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export function ProjectDetailClient({
  projectId,
  subscriptionPlan
}: {
  projectId: string;
  subscriptionPlan: SubscriptionPlan;
}) {
  const t = useI18n();
  const query = useProject(projectId);
  const entitlements = useEntitlements();
  const usage = useUsage();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingArt, setIsAnalyzingArt] = useState(false);
  const [isUploadingArtAsset, setIsUploadingArtAsset] = useState(false);
  const [isGeneratingGdd, setIsGeneratingGdd] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectOverviewFormState>({
    name: "",
    elevatorPitch: "",
    description: "",
    genreInput: "",
    tagInput: "",
    targetAudience: "",
    coreLoop: "",
    differentiator: "",
    monetizationModel: "",
    artDirection: "",
    playerFantasy: "",
    pricePointCents: "",
    stage: "DISCOVERY"
  });
  const [newMilestone, setNewMilestone] = useState({
    title: "",
    description: "",
    ownerLabel: "",
    status: "PLANNED",
    dueAt: "",
    budgetedCostCents: "",
    expectedRevenueCents: ""
  });
  const [milestoneEdits, setMilestoneEdits] = useState<Record<string, {
    title: string;
    description: string;
    ownerLabel: string;
    status: string;
    dueAt: string;
    budgetedCostCents: string;
    expectedRevenueCents: string;
  }>>({});
  const [newColumn, setNewColumn] = useState({ name: "", color: "" });
  const [newCards, setNewCards] = useState<Record<string, {
    title: string;
    description: string;
    assigneeLabel: string;
    dueDate: string;
    labels: string;
  }>>({});
  const [cardEdits, setCardEdits] = useState<Record<string, {
    title: string;
    description: string;
    assigneeLabel: string;
    dueDate: string;
    labels: string;
    columnId: string;
  }>>({});
  const [kanbanSearch, setKanbanSearch] = useState("");
  const [kanbanAssigneeFilter, setKanbanAssigneeFilter] = useState("all");
  const [kanbanLabelFilter, setKanbanLabelFilter] = useState("all");
  const [executionView, setExecutionView] = useState<"board" | "milestones">("board");
  const [artAssetForm, setArtAssetForm] = useState({
    kind: "capsule",
    notes: ""
  });

  useEffect(() => {
    if (!query.data) {
      return;
    }

    setProjectForm({
      name: query.data.name,
      elevatorPitch: query.data.elevatorPitch ?? "",
      description: query.data.description ?? "",
      genreInput: query.data.genreInput ?? "",
      tagInput: query.data.tagInput ?? "",
      targetAudience: query.data.targetAudience ?? "",
      coreLoop: query.data.coreLoop ?? "",
      differentiator: query.data.differentiator ?? "",
      monetizationModel: query.data.monetizationModel ?? "",
      artDirection: query.data.artDirection ?? "",
      playerFantasy: query.data.playerFantasy ?? "",
      pricePointCents: query.data.pricePointCents ? String(query.data.pricePointCents) : "",
      stage: query.data.stage ?? "DISCOVERY"
    });

    const nextCardEdits: Record<string, {
      title: string;
      description: string;
      assigneeLabel: string;
      dueDate: string;
      labels: string;
      columnId: string;
    }> = {};

    for (const boardItem of query.data.kanbanBoards ?? []) {
      for (const column of boardItem.columns ?? []) {
        for (const card of column.cards ?? []) {
          nextCardEdits[card.id] = {
            title: card.title,
            description: card.description ?? "",
            assigneeLabel: card.assigneeLabel ?? "",
            dueDate: card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : "",
            labels: Array.isArray(card.labels) ? card.labels.join(", ") : "",
            columnId: column.id
          };
        }
      }
    }

    setCardEdits(nextCardEdits);

    const nextMilestoneEdits: Record<string, {
      title: string;
      description: string;
      ownerLabel: string;
      status: string;
      dueAt: string;
      budgetedCostCents: string;
      expectedRevenueCents: string;
    }> = {};

    for (const milestone of query.data.milestones ?? []) {
      nextMilestoneEdits[milestone.id] = {
        title: milestone.title,
        description: milestone.description ?? "",
        ownerLabel: milestone.ownerLabel ?? "",
        status: milestone.status,
        dueAt: milestone.dueAt ? new Date(milestone.dueAt).toISOString().slice(0, 10) : "",
        budgetedCostCents: String(milestone.budgetedCostCents ?? 0),
        expectedRevenueCents: String(milestone.expectedRevenueCents ?? 0)
      };
    }

    setMilestoneEdits(nextMilestoneEdits);
  }, [query.data]);

  const canRunViabilityAnalysis = entitlements.canUse("viabilityAnalysis");
  const canRunArtAnalysis = entitlements.canUse("artAnalysis");
  const canGenerateGdd = entitlements.canUse("gdd");
  const isProArtAnalysis = entitlements.canUse("earlyAccess");
  const viabilityLimit = entitlements.getLimit("viabilityAnalysesPerMonth");
  const artLimit = entitlements.getLimit("artAnalysesPerMonth");
  const gddLimit = entitlements.getLimit("gdds");

  async function saveProject() {
    setFeedback(null);
    setIsSaving(true);

    const result = await saveProjectOverview(projectId, projectForm);

    setIsSaving(false);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.saveProjectError"));
      return;
    }

    setFeedback(t("projectDetail.projectSaved"));
    await query.refetch();
  }

  async function runAnalysis() {
    setFeedback(null);
    setIsAnalyzing(true);

    const result = await runProjectAnalysis(projectId);

    setIsAnalyzing(false);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.analyzeProjectError"));
      return;
    }

    setFeedback(t("projectDetail.marketAnalysisUpdated"));
    await query.refetch();
  }

  async function generateGdd() {
    setFeedback(null);
    setIsGeneratingGdd(true);

    const result = await generateProjectGdd(projectId);

    setIsGeneratingGdd(false);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.generateGddError"));
      return;
    }

    setFeedback(t("projectDetail.gddGenerated"));
    await query.refetch();
  }

  async function runArtAnalysis() {
    setFeedback(null);
    setIsAnalyzingArt(true);

    const result = await runProjectArtAnalysis(projectId);

    setIsAnalyzingArt(false);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.artAnalysisError"));
      return;
    }

    setFeedback(t("projectDetail.artAnalysisUpdated"));
    await query.refetch();
  }

  async function uploadArtAsset(file: File | null) {
    setFeedback(null);

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/") || file.size > 12 * 1024 * 1024) {
      setFeedback("Upload an image up to 12 MB.");
      return;
    }

    setIsUploadingArtAsset(true);
    const result = await uploadProjectArtAsset(projectId, file, artAssetForm.kind, artAssetForm.notes);

    setIsUploadingArtAsset(false);

    if (!result.ok) {
      setFeedback(result.message ?? "Não foi possível enviar o asset de arte.");
      return;
    }

    setArtAssetForm({
      kind: "capsule",
      notes: ""
    });
    setFeedback("Asset de arte enviado.");
    await query.refetch();
  }

  async function deleteArtAsset(assetId: string) {
    setFeedback(null);

    const result = await deleteProjectArtAsset(projectId, assetId);

    if (!result.ok) {
      setFeedback(result.message ?? "Não foi possível excluir o asset de arte.");
      return;
    }

    setFeedback("Asset de arte excluído.");
    await query.refetch();
  }

  async function createMilestone() {
    setFeedback(null);

    const result = await createProjectMilestone(projectId, newMilestone);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.createMilestoneError"));
      return;
    }

    setNewMilestone({
      title: "",
      description: "",
      ownerLabel: "",
      status: "PLANNED",
      dueAt: "",
      budgetedCostCents: "",
      expectedRevenueCents: ""
    });
    setFeedback(t("projectDetail.milestoneCreated"));
    await query.refetch();
  }

  async function saveMilestone(milestoneId: string) {
    const milestone = milestoneEdits[milestoneId];

    if (!milestone?.title.trim()) {
      setFeedback(t("projectDetail.milestoneTitleRequired"));
      return;
    }

    const result = await saveProjectMilestone(projectId, milestoneId, milestone);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.saveMilestoneError"));
      return;
    }

    setFeedback(t("projectDetail.milestoneUpdated"));
    await query.refetch();
  }

  async function createColumn() {
    setFeedback(null);

    const result = await createProjectKanbanColumn(projectId, newColumn.name, newColumn.color);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.createColumnError"));
      return;
    }

    setNewColumn({ name: "", color: "" });
    setFeedback(t("projectDetail.columnCreated"));
    await query.refetch();
  }

  async function updateColumn(columnId: string, name: string, color: string | null, sortOrder: number) {
    const result = await updateProjectKanbanColumn(projectId, columnId, name, color, sortOrder);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.updateColumnError"));
      return;
    }

    setFeedback(t("projectDetail.columnUpdated"));
    await query.refetch();
  }

  async function createCard(columnId: string) {
    const cardState = newCards[columnId];

    if (!cardState?.title?.trim()) {
      setFeedback(t("projectDetail.cardTitleRequired"));
      return;
    }

    const result = await createProjectKanbanCard(projectId, columnId, cardState);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.createCardError"));
      return;
    }

    setNewCards((current) => ({
      ...current,
      [columnId]: {
        title: "",
        description: "",
        assigneeLabel: "",
        dueDate: "",
        labels: ""
      }
    }));
    setFeedback(t("projectDetail.cardCreated"));
    await query.refetch();
  }

  async function saveCard(cardId: string) {
    const cardState = cardEdits[cardId];

    if (!cardState?.title.trim()) {
      setFeedback(t("projectDetail.cardTitleRequired"));
      return;
    }

    const result = await saveProjectKanbanCard(projectId, cardId, cardState);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.saveCardError"));
      return;
    }

    setFeedback(t("projectDetail.cardUpdated"));
    await query.refetch();
  }

  async function moveCard(cardId: string, columnId: string) {
    const result = await moveProjectKanbanCard(projectId, cardId, columnId);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.moveCardError"));
      return;
    }

    await query.refetch();
  }

  async function moveCardInColumn(cardId: string, direction: "up" | "down") {
    const result = await moveProjectKanbanCardInColumn(projectId, cardId, direction);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.moveCardError"));
      return;
    }

    await query.refetch();
  }

  async function reorderCard(cardId: string, columnId: string, targetIndex: number) {
    const result = await reorderProjectKanbanCard(projectId, cardId, columnId, targetIndex);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.moveCardError"));
      return;
    }

    await query.refetch();
  }

  async function deleteCard(cardId: string) {
    const confirmed = window.confirm(t("projectDetail.deleteCardConfirm"));

    if (!confirmed) {
      return;
    }

    const result = await deleteProjectKanbanCard(projectId, cardId);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.deleteCardError"));
      return;
    }

    setFeedback(t("common.delete"));
    await query.refetch();
  }

  async function moveColumn(columnId: string, direction: "left" | "right") {
    const result = await moveProjectKanbanColumn(projectId, columnId, direction);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.moveColumnError"));
      return;
    }

    await query.refetch();
  }

  async function deleteColumn(columnId: string) {
    const confirmed = window.confirm(t("projectDetail.deleteColumnConfirm"));

    if (!confirmed) {
      return;
    }

    const result = await deleteProjectKanbanColumn(projectId, columnId);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.deleteColumnError"));
      return;
    }

    setFeedback(t("common.delete"));
    await query.refetch();
  }

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">{t("projectDetail.loading")}</p>;
  }

  if (query.isError || !query.data) {
    return <ErrorState title={t("projectDetail.unavailable")} description={t("projectDetail.unavailableDescription")} />;
  }

  const project = {
    ...query.data,
    stage: query.data.stage ?? "DISCOVERY",
    assigneeOptions: query.data.assigneeOptions ?? [],
    gdds: query.data.gdds ?? [],
    milestones: query.data.milestones ?? [],
    budgets: (query.data.budgets ?? []).map((budget) => ({
      ...budget,
      lines: budget.lines ?? []
    })),
    revenueEntries: query.data.revenueEntries ?? [],
    expenseEntries: query.data.expenseEntries ?? [],
    approvalRequests: query.data.approvalRequests ?? [],
    artAssets: (query.data.artAssets ?? []).map((asset) => ({
      ...asset,
      kind: asset.kind ?? "asset",
      originalName: asset.originalName ?? "Asset",
      sizeBytes: asset.sizeBytes ?? 0
    })),
    competitorGames: (query.data.competitorGames ?? []).filter((item) => item?.steamGame).map((item) => ({
      ...item,
      steamGame: {
        ...item.steamGame,
        revenueEstimates: item.steamGame.revenueEstimates ?? [],
        genres: item.steamGame.genres ?? [],
        tags: item.steamGame.tags ?? []
      }
    })),
    kanbanBoards: (query.data.kanbanBoards ?? []).map((kanbanBoard) => ({
      ...kanbanBoard,
      columns: (kanbanBoard.columns ?? []).map((column) => ({
        ...column,
        cards: column.cards ?? []
      }))
    }))
  };
  const board = project.kanbanBoards[0] ?? null;
  const latestGdd = project.gdds[0] ?? null;
  const assigneeOptions = project.assigneeOptions;
  const marketDepth = project.analysis?.metadata?.marketDepth ?? null;
  const competitionLayer = project.analysis?.metadata?.competitionLayer ?? null;
  const opportunityLayer = project.analysis?.metadata?.opportunityLayer ?? null;
  const projectFitLayer = project.analysis?.metadata?.projectFitLayer ?? null;
  const hybridMarketIntelligence = project.analysis?.metadata?.hybridMarketIntelligence ?? null;
  const aiLayer = project.analysis?.metadata?.aiLayer ?? null;
  const opportunityRecommendations = Array.isArray(opportunityLayer?.practicalRecommendations) ? opportunityLayer.practicalRecommendations : [];
  const opportunityMismatches = Array.isArray(opportunityLayer?.keyMismatches) ? opportunityLayer.keyMismatches : [];
  const aiCreativeAngles = Array.isArray(aiLayer?.creativeAngles) ? aiLayer.creativeAngles : [];
  const aiAcquisitionChannels = Array.isArray(aiLayer?.acquisitionChannels) ? aiLayer.acquisitionChannels : [];
  const aiWishlistDrivers = Array.isArray(aiLayer?.wishlistDrivers) ? aiLayer.wishlistDrivers : [];
  const aiRedFlags = Array.isArray(aiLayer?.redFlags) ? aiLayer.redFlags : [];
  const hybridProbabilities = hybridMarketIntelligence?.probabilisticAssessment?.probabilities ?? {};
  const hybridFactors = Array.isArray(hybridMarketIntelligence?.opportunityScoring?.factors) ? hybridMarketIntelligence.opportunityScoring.factors : [];
  const hybridEmergingTags = Array.isArray(hybridMarketIntelligence?.trendDetection?.emergingTags) ? hybridMarketIntelligence.trendDetection.emergingTags : [];
  const hybridDecliningSignals = Array.isArray(hybridMarketIntelligence?.trendDetection?.decliningSignals) ? hybridMarketIntelligence.trendDetection.decliningSignals : [];
  const hybridMarketLeaders = Array.isArray(hybridMarketIntelligence?.competitiveIntelligence?.marketLeaders) ? hybridMarketIntelligence.competitiveIntelligence.marketLeaders : [];
  const hybridSuccessfulLaunches = Array.isArray(hybridMarketIntelligence?.competitiveIntelligence?.recentlySuccessfulLaunches) ? hybridMarketIntelligence.competitiveIntelligence.recentlySuccessfulLaunches : [];
  const hybridFailedLaunches = Array.isArray(hybridMarketIntelligence?.competitiveIntelligence?.failedLaunches) ? hybridMarketIntelligence.competitiveIntelligence.failedLaunches : [];
  const hybridEvidenceTrail = Array.isArray(hybridMarketIntelligence?.evidenceTrail) ? hybridMarketIntelligence.evidenceTrail : [];
  const hybridSourcesUsed = Array.isArray(hybridMarketIntelligence?.sourcesUsed) ? hybridMarketIntelligence.sourcesUsed : [];
  const hybridLimitations = Array.isArray(hybridMarketIntelligence?.dataQuality?.limitations) ? hybridMarketIntelligence.dataQuality.limitations : [];
  const milestoneBudgetTotal = project.milestones.reduce((sum, item) => sum + item.budgetedCostCents, 0);
  const milestoneRevenueTotal = project.milestones.reduce((sum, item) => sum + item.expectedRevenueCents, 0);
  const pendingApprovalsCount = project.approvalRequests.filter((item) => item.status === "PENDING").length;
  const artMetadata = (project.artAnalysis?.metadata ?? null) as {
    uploadedArtAssets?: {
      total: number;
      measured: number;
      highResolution: number;
      capsuleRatio: number;
      square: number;
      evidenceScore: number;
      pixelAnalyzed?: number;
      averageReadabilityScore?: number;
      averageContrast?: number;
      averageSaturation?: number;
      averageEdgeDensity?: number;
      highLegibilityRisk?: number;
      dominantColors?: string[];
    };
    proArtBrief?: {
      capsuleReadinessScore: number;
      shelfGapSummary: string;
      productionLevers: string[];
      referenceShelf: Array<{
        name: string;
        reviewScore: number;
        priceCents: number;
      }>;
    } | null;
    aiArtLayer?: {
      visualCritique: string;
      firstReadAssessment: string;
      capsuleAdvice: string;
      productionAdvice: string;
      marketPositioningAdvice: string;
      confidenceNarrative: string;
      priorityFixes: string[];
      strengths: string[];
      risks: string[];
    } | null;
  } | null;
  const uploadedArtAssets = artMetadata?.uploadedArtAssets ?? null;
  const uploadedDominantColors = Array.isArray(uploadedArtAssets?.dominantColors) ? uploadedArtAssets.dominantColors : [];
  const proProductionLevers = Array.isArray(artMetadata?.proArtBrief?.productionLevers)
    ? artMetadata.proArtBrief.productionLevers
    : ["Rode a camada Pro de arte para receber alavancas de execução para escopo e polimento de loja."];
  const proReferenceShelf = Array.isArray(artMetadata?.proArtBrief?.referenceShelf) ? artMetadata.proArtBrief.referenceShelf : [];
  const aiArtPriorityFixes = Array.isArray(artMetadata?.aiArtLayer?.priorityFixes) ? artMetadata.aiArtLayer.priorityFixes : [];
  const aiArtStrengths = Array.isArray(artMetadata?.aiArtLayer?.strengths) ? artMetadata.aiArtLayer.strengths : [];
  const aiArtRisks = Array.isArray(artMetadata?.aiArtLayer?.risks) ? artMetadata.aiArtLayer.risks : [];

  return (
    <div className="space-y-6">
      <Card className="aurora-panel overflow-hidden border-white/10 shadow-[0_30px_80px_rgba(14,165,233,0.1)]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{project.name}</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {project.elevatorPitch || t("projectDetail.defaultPitch")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button disabled={isAnalyzing || !canRunViabilityAnalysis} onClick={runAnalysis}>
                {isAnalyzing ? t("projectDetail.analyzing") : t("projectDetail.runMarketAnalysis")}
              </Button>
              <Button disabled={isAnalyzingArt || !canRunArtAnalysis} variant="outline" onClick={runArtAnalysis}>
                {isAnalyzingArt ? t("projectDetail.analyzingArt") : t("projectDetail.runArtAnalysis")}
              </Button>
              <Button disabled={isGeneratingGdd || !canGenerateGdd} variant="outline" onClick={generateGdd}>
                {isGeneratingGdd ? t("projectDetail.generating") : t("projectDetail.generateGdd")}
              </Button>
              <ExportActions
                label={t("common.exportProject")}
                xlsxHref={`/api/exports/projects/${projectId}?format=xlsx`}
                csvHref={`/api/exports/projects/${projectId}?format=csv`}
                googleSheetsEndpoint={`/api/exports/projects/${projectId}`}
              />
            </div>
          </div>
          <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-background/70 p-4 text-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t("projectDetail.stageLabel")}</span>
              <span className="font-medium">{(project.stage ?? "DISCOVERY").replaceAll("_", " ")}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t("projectDetail.milestonesLabel")}</span>
              <span className="font-medium">{formatNumber(project.milestones.length)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t("projectDetail.pendingApprovalsLabel")}</span>
              <span className="font-medium">{formatNumber(pendingApprovalsCount)}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/35 p-3 dark:bg-white/[0.04]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{t("projectDetail.operatingMode")}</p>
              <p className="mt-2 font-medium">{t("projectDetail.executionLoopCopy")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
        <p>Uso atual: {usage.usage?.viabilityAnalysesPerMonth ?? 0} de {viabilityLimit ? getLimitLabel(viabilityLimit) : "..."}</p>
        <p>Uso atual: {usage.usage?.artAnalysesPerMonth ?? 0} de {artLimit ? getLimitLabel(artLimit) : "..."}</p>
        <p>Uso atual: {usage.usage?.gdds ?? 0} de {gddLimit ? getLimitLabel(gddLimit) : "..."}</p>
      </div>
      {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-[1.5rem] border border-white/10 bg-white/55 p-2 backdrop-blur dark:bg-white/[0.04]">
          <TabsTrigger value="overview">{t("projectDetail.overviewTab")}</TabsTrigger>
          <TabsTrigger value="market">{t("projectDetail.marketTab")}</TabsTrigger>
          <TabsTrigger value="art">{t("projectDetail.artTab")}</TabsTrigger>
          <TabsTrigger value="milestones">{t("projectDetail.executionTab")}</TabsTrigger>
          <TabsTrigger value="gdd">{t("projectDetail.gddTab")}</TabsTrigger>
        </TabsList>
        <p className="text-sm text-muted-foreground">
          {t("projectDetail.sectionsHelp")}
        </p>
        <TabsContent value="overview" className="space-y-6">
          <ProjectOverviewForm
            form={projectForm}
            isSaving={isSaving}
            savingLabel={t("projectDetail.saving")}
            saveLabel={t("projectDetail.saveProject")}
            onChange={setProjectForm}
            onSave={saveProject}
          />
          <DemoManagerPageClient
            projectId={projectId}
            sections={["Overview", "Etapa Atual", "Prioridades", "Exportar / Importar"]}
            showHeader={false}
          />
        </TabsContent>
        <TabsContent value="market" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Oportunidade</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatNumber(opportunityLayer?.opportunityScore ?? null)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risco</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatNumber(opportunityLayer?.riskScore ?? null)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comparáveis diretos</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatNumber(competitionLayer?.directComparableCount ?? project.analysis?.competitionCount ?? null)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receita mediana</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatCurrency(project.analysis?.medianRevenueCents ?? null)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Confiança de mercado</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatNumber(marketDepth?.confidenceScore ?? null)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fit do projeto</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatNumber(projectFitLayer?.overallFitScore ?? null)}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Análise de mercado integrada</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <p>{project.analysis?.marketSummary ?? "Rode a análise de mercado para preencher esta seção."}</p>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Oportunidade</p>
                    <p className="mt-2 text-muted-foreground">{project.analysis?.opportunitySummary ?? "Análise pendente."}</p>
                  </div>
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Risco</p>
                  <p className="mt-2 text-muted-foreground">{project.analysis?.riskSummary ?? "Análise pendente."}</p>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Público sugerido</p>
                  <p className="mt-2 text-muted-foreground">{project.analysis?.audienceAutofill ?? "Análise pendente."}</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Loop principal sugerido</p>
                  <p className="mt-2 text-muted-foreground">{project.analysis?.coreLoopAutofill ?? "Análise pendente."}</p>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Gêneros sugeridos</p>
                  <p className="mt-2 text-muted-foreground">
                    {project.analysis?.suggestedGenres?.join(", ") || "Análise pendente."}
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Tags sugeridas</p>
                  <p className="mt-2 text-muted-foreground">
                    {project.analysis?.suggestedTags?.join(", ") || "Análise pendente."}
                  </p>
                  </div>
                </div>
                {aiLayer ? (
                  <>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Leitura estratégica da IA</p>
                        <p className="mt-2 text-muted-foreground">{aiLayer.strategicNarrative}</p>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Diferencial de posicionamento</p>
                        <p className="mt-2 text-muted-foreground">{aiLayer.positioningSummary}</p>
                      </div>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Estratégia de lançamento</p>
                        <p className="mt-2 text-muted-foreground">{aiLayer.launchStrategy}</p>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Preço e desenho da oferta</p>
                        <p className="mt-2 text-muted-foreground">{aiLayer.pricingNarrative}</p>
                      </div>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Cápsula da loja e mensagem</p>
                        <p className="mt-2 text-muted-foreground">{aiLayer.storeCapsuleAdvice}</p>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Leitura de confiança da IA</p>
                        <p className="mt-2 text-muted-foreground">{aiLayer.confidenceNarrative}</p>
                      </div>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Ângulos criativos</p>
                        <ul className="mt-2 space-y-2 text-muted-foreground">
                          {aiCreativeAngles.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Canais de aquisição</p>
                        <ul className="mt-2 space-y-2 text-muted-foreground">
                          {aiAcquisitionChannels.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Gatilhos de wishlist</p>
                        <ul className="mt-2 space-y-2 text-muted-foreground">
                          {aiWishlistDrivers.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Alertas da IA</p>
                        <ul className="mt-2 space-y-2 text-muted-foreground">
                          {aiRedFlags.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
            {hybridMarketIntelligence ? (
              <Card>
                <CardHeader>
                  <CardTitle>Inteligência quantitativa de mercado</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-5 text-sm">
                  <div className="grid gap-4 lg:grid-cols-4">
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Score de oportunidade</p>
                      <p className="mt-2 text-3xl font-semibold">{formatNumber(hybridMarketIntelligence.opportunityScoring?.score ?? null)}</p>
                      <p className="mt-1 text-muted-foreground">{hybridMarketIntelligence.opportunityScoring?.label ?? "Análise pendente."}</p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Classificação</p>
                      <p className="mt-2 font-medium">{hybridMarketIntelligence.probabilisticAssessment?.classification ?? "Análise pendente."}</p>
                      <p className="mt-1 text-muted-foreground">Confiança {hybridMarketIntelligence.probabilisticAssessment?.confidenceLevel ?? "N/A"}</p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Demanda</p>
                      <p className="mt-2 text-2xl font-semibold">{formatNumber(hybridMarketIntelligence.demandModel?.demandScore ?? null)}</p>
                      <p className="mt-1 text-muted-foreground">Proxy de wishlist {formatNumber(hybridMarketIntelligence.demandModel?.wishlistProxy?.score ?? null)}</p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Faixa de receita</p>
                      <p className="mt-2 font-medium">
                        {formatCurrency(hybridMarketIntelligence.demandModel?.revenuePotentialRange?.lowCents ?? null)} - {formatCurrency(hybridMarketIntelligence.demandModel?.revenuePotentialRange?.highCents ?? null)}
                      </p>
                      <p className="mt-1 text-muted-foreground">Mediana {formatCurrency(hybridMarketIntelligence.demandModel?.revenuePotentialRange?.medianCents ?? null)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Conclusão probabilística</p>
                    <p className="mt-2 text-muted-foreground">{hybridMarketIntelligence.probabilisticAssessment?.conclusion ?? "Análise pendente."}</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {Object.entries(hybridProbabilities).map(([key, value]) => (
                        <div key={key} className="rounded-xl border bg-muted/30 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</p>
                          <p className="mt-1 text-lg font-semibold">{typeof value === "number" || typeof value === "string" ? value : "N/A"}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Fatores ponderados do score</p>
                      <div className="mt-3 space-y-3">
                        {hybridFactors.map((factor) => (
                          <div key={factor.name} className="rounded-xl border bg-muted/30 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium">{factor.name}</p>
                              <p className="text-sm text-muted-foreground">{factor.score}/100 · peso {factor.weight}</p>
                            </div>
                            <p className="mt-2 text-muted-foreground">{factor.justification}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Detecção de tendências</p>
                      <p className="mt-2 text-muted-foreground">{hybridMarketIntelligence.trendDetection?.marketShiftExplanation ?? "Análise pendente."}</p>
                      <div className="mt-3 space-y-3">
                        {hybridEmergingTags.slice(0, 4).map((trend) => (
                          <div key={trend.tag} className="rounded-xl border bg-muted/30 p-3">
                            <p className="font-medium">{trend.tag} · {trend.strengthScore}</p>
                            <p className="mt-1 text-muted-foreground">{trend.explanation}</p>
                          </div>
                        ))}
                        {hybridDecliningSignals.slice(0, 3).map((trend) => (
                          <div key={trend.signal} className="rounded-xl border bg-muted/30 p-3">
                            <p className="font-medium">{trend.signal} · {trend.score}</p>
                            <p className="mt-1 text-muted-foreground">{trend.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-3">
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Líderes de mercado</p>
                      <ul className="mt-3 space-y-2 text-muted-foreground">
                        {hybridMarketLeaders.slice(0, 5).map((game) => (
                          <li key={game.appId}>{game.name} · {formatCurrency(game.medianRevenueCents)} · {formatNumber(game.reviewScore)}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Lançamentos recentes bem-sucedidos</p>
                      <ul className="mt-3 space-y-2 text-muted-foreground">
                        {hybridSuccessfulLaunches.length
                          ? hybridSuccessfulLaunches.slice(0, 5).map((game) => (
                              <li key={game.appId}>{game.name} · {formatNumber(game.reviewScore)}% · {formatNumber(game.reviewCount)} reviews</li>
                            ))
                          : <li>Nenhum lançamento recente de alta confiança neste conjunto comparável.</li>}
                      </ul>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Lançamentos similares fracos ou malsucedidos</p>
                      <ul className="mt-3 space-y-2 text-muted-foreground">
                        {hybridFailedLaunches.length
                          ? hybridFailedLaunches.slice(0, 5).map((game) => (
                              <li key={game.appId}>{game.name} · {formatNumber(game.reviewScore)}% · {formatNumber(game.reviewCount)} reviews</li>
                            ))
                          : <li>Nenhum lançamento recente claramente fraco neste conjunto comparável.</li>}
                      </ul>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Trilha de evidências</p>
                      <div className="mt-3 space-y-3">
                        {hybridEvidenceTrail.map((item) => (
                          <div key={item.claim} className="rounded-xl border bg-muted/30 p-3">
                            <p className="font-medium">{item.claim}</p>
                            <p className="mt-1 text-muted-foreground">{item.support}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Fontes: {item.sources.join(", ")}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Qualidade dos dados</p>
                      <p className="mt-2 text-muted-foreground">
                        Confiança {hybridMarketIntelligence.dataQuality?.label ?? "N/A"} ({formatNumber(hybridMarketIntelligence.dataQuality?.score ?? null)}/100). Dependência de IA: {hybridMarketIntelligence.aiDependency?.replaceAll("_", " ") ?? "N/A"}.
                      </p>
                      <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">Fontes usadas</p>
                      <p className="mt-2 text-muted-foreground">{hybridSourcesUsed.join(", ") || "Fontes indisponíveis."}</p>
                      {hybridLimitations.length ? (
                        <ul className="mt-3 space-y-2 text-muted-foreground">
                          {hybridLimitations.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Profundidade de mercado</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Tamanho de mercado</p>
                    <p className="mt-2 text-foreground">
                      {marketDepth ? `${marketDepth.marketSizeLabel} · ${formatCurrency(marketDepth.marketSizeCents)}` : "Análise pendente."}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Velocidade de reviews</p>
                    <p className="mt-2 text-foreground">
                      {marketDepth ? `${formatNumber(marketDepth.reviewVelocity90)} vs ${formatNumber(marketDepth.previousReviewVelocity90)} nos 90 dias anteriores` : "Análise pendente."}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Momento de jogadores</p>
                    <p className="mt-2 text-foreground">
                      {marketDepth ? `${formatNumber(marketDepth.playerMomentum30)} média vs ${formatNumber(marketDepth.previousPlayerMomentum30)}` : "Análise pendente."}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Coortes de lançamento</p>
                    <p className="mt-2 text-foreground">
                      {marketDepth ? `${marketDepth.launchCohorts?.last90Days ?? 0} / 90d · ${marketDepth.launchCohorts?.last180Days ?? 0} / 180d · ${marketDepth.launchCohorts?.last365Days ?? 0} / 365d` : "Análise pendente."}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4 md:col-span-2">
                    <p className="font-medium">Distribuição de preço</p>
                    <p className="mt-2 text-foreground">
                      {marketDepth
                        ? `<$10: ${marketDepth.priceBandDistribution?.under10 ?? 0} · $10-20: ${marketDepth.priceBandDistribution?.between10And20 ?? 0} · $20-30: ${marketDepth.priceBandDistribution?.between20And30 ?? 0} · $30+: ${marketDepth.priceBandDistribution?.over30 ?? 0}`
                        : "Análise pendente."}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Camada competitiva</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Diretos vs adjacentes</p>
                    <p className="mt-2 text-foreground">
                      {competitionLayer ? `${competitionLayer.directComparableCount} diretos · ${competitionLayer.adjacentComparableCount} adjacentes` : "Análise pendente."}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Saturação</p>
                    <p className="mt-2 text-foreground">
                      {formatNumber(competitionLayer?.crowdednessScore ?? null)}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Concentração de receita</p>
                    <p className="mt-2 text-foreground">
                      {competitionLayer ? `${competitionLayer.winnerConcentrationScore}% nos vencedores principais` : "Análise pendente."}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Barra de qualidade</p>
                    <p className="mt-2 text-foreground">
                      {formatNumber(competitionLayer?.qualityBarScore ?? null)}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4 md:col-span-2">
                    <p className="font-medium">Mix de monetização</p>
                    <p className="mt-2 text-foreground">
                      {competitionLayer ? `${competitionLayer.dominantMonetization} dominante · ${competitionLayer.premiumSharePercent}% premium` : "Análise pendente."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Camada de oportunidade</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Score de nicho mal atendido</p>
                    <p className="mt-2 text-foreground">{formatNumber(opportunityLayer?.underservedScore ?? null)}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Potencial de receita</p>
                    <p className="mt-2 text-foreground">{formatNumber(opportunityLayer?.revenuePotentialScore ?? null)}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">{t("projectDetail.executionBar")}</p>
                    <p className="mt-2 text-foreground">{formatNumber(opportunityLayer?.executionBarScore ?? null)}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Confiança</p>
                    <p className="mt-2 text-foreground">
                      {marketDepth ? `${marketDepth.confidenceLabel} (${marketDepth.confidenceScore})` : "Análise pendente."}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4 md:col-span-2">
                    <p className="font-medium">Recomendações práticas</p>
                    <ul className="mt-2 space-y-2 text-muted-foreground">
                      {opportunityRecommendations.length ? opportunityRecommendations.map((item) => (
                        <li key={item}>- {item}</li>
                      )) : <li>Análise pendente.</li>}
                    </ul>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Camada de fit do projeto</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Fit de gênero/tag</p>
                    <p className="mt-2 text-foreground">{formatNumber(projectFitLayer?.genreTagCoverageScore ?? null)}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Fit de preço</p>
                    <p className="mt-2 text-foreground">{formatNumber(projectFitLayer?.priceFitScore ?? null)}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Fit de monetização</p>
                    <p className="mt-2 text-foreground">{formatNumber(projectFitLayer?.monetizationFitScore ?? null)}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Clareza de posicionamento</p>
                    <p className="mt-2 text-foreground">{formatNumber(projectFitLayer?.positioningClarityScore ?? null)}</p>
                  </div>
                  <div className="rounded-2xl border p-4 md:col-span-2">
                    <p className="font-medium">Principais desalinhamentos</p>
                    <ul className="mt-2 space-y-2 text-muted-foreground">
                      {opportunityMismatches.length ? opportunityMismatches.map((item) => (
                        <li key={item}>- {item}</li>
                      )) : <li>{t("projectDetail.noMismatches")}</li>}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Jogos comparáveis da Steam</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {project.competitorGames.length > 0 ? project.competitorGames.map((item) => (
                <div key={item.steamGame.id} className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-medium">{item.steamGame.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Reviews: {formatNumber(item.steamGame.reviewCount)} · Nota: {formatPercent(item.steamGame.reviewScore ?? null, 1)}
                      </p>
                    </div>
                    <p className="text-sm font-medium">
                      {formatCurrency(item.steamGame.revenueEstimates[0]?.medianNetRevenueCents ?? null)}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">{t("projectDetail.noComparableSet")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="art" className="space-y-6">
          {!canRunArtAnalysis ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("projectDetail.artNotIncluded")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Seu acesso atual não inclui análise de artes. Faça upgrade para benchmark de posicionamento visual,
                  complexidade de produção e encaixe arte-mercado dentro de cada projeto.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="overflow-hidden border-cyan-300/15 bg-gradient-to-br from-background via-background to-cyan-950/15">
                <CardHeader>
                  <CardTitle>Assets de arte enviados</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-3 rounded-2xl border border-dashed border-cyan-300/25 bg-cyan-400/[0.04] p-4 lg:grid-cols-[180px_minmax(0,1fr)_220px]">
                    <div className="space-y-2">
                      <Label>Tipo de asset</Label>
                      <Select value={artAssetForm.kind} onValueChange={(value) => setArtAssetForm((current) => ({ ...current, kind: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="capsule">Cápsula Steam</SelectItem>
                          <SelectItem value="header">Header/key art</SelectItem>
                          <SelectItem value="screenshot">Screenshot</SelectItem>
                          <SelectItem value="character">Personagem</SelectItem>
                          <SelectItem value="environment">Ambiente</SelectItem>
                          <SelectItem value="reference">Referência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="art-asset-notes">Observações</Label>
                      <Input
                        id="art-asset-notes"
                        value={artAssetForm.notes}
                        onChange={(event) => setArtAssetForm((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="O que a análise deve observar?"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="art-asset-file">Imagem</Label>
                      <Input
                        id="art-asset-file"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        disabled={isUploadingArtAsset}
                        onChange={(event) => uploadArtAsset(event.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>
                  {project.artAssets.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {project.artAssets.map((asset) => (
                        <div key={asset.id} className="overflow-hidden rounded-2xl border bg-muted/20">
                          {asset.signedUrl ? (
                            <img src={asset.signedUrl} alt={asset.originalName} className="h-52 w-full object-cover" />
                          ) : (
                            <div className="flex h-52 items-center justify-center bg-muted text-sm text-muted-foreground">Prévia indisponível</div>
                          )}
                          <div className="space-y-2 p-4 text-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">{(asset.kind ?? "asset").replaceAll("_", " ")}</p>
                                <p className="text-muted-foreground">{asset.originalName}</p>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => deleteArtAsset(asset.id)}>
                                Excluir
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {asset.width && asset.height ? `${asset.width} x ${asset.height}` : "Dimensões indisponíveis"} · {(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB
                            </p>
                            {asset.visualMetrics ? (
                              <div className="grid gap-2 rounded-xl border bg-background/60 p-3 text-xs">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-muted-foreground">Legibilidade</span>
                                  <span className="font-medium">{asset.visualMetrics.readabilityScore}/100 · risco {asset.visualMetrics.legibilityRisk}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-muted-foreground">Contraste / saturação</span>
                                  <span className="font-medium">{asset.visualMetrics.contrast} / {asset.visualMetrics.saturation}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-muted-foreground">Cor dominante</span>
                                  <span className="inline-flex items-center gap-2 font-medium">
                                    <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: asset.visualMetrics.dominantColor }} />
                                    {asset.visualMetrics.dominantColor}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">Métricas de pixel indisponíveis para este arquivo. Reenvie para analisar a legibilidade visual.</p>
                            )}
                            {asset.notes ? <p className="text-xs text-muted-foreground">{asset.notes}</p> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
                      Envie cápsulas, headers, screenshots, personagens, ambientes ou referências antes de rodar a análise de arte. Sem uploads, o sistema só consegue estimar a partir do texto do projeto e dos comparáveis de mercado.
                    </div>
                  )}
                </CardContent>
              </Card>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Distinção</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatNumber(project.artAnalysis?.distinctivenessScore ?? null)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Complexidade de produção</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatNumber(project.artAnalysis?.productionComplexityScore ?? null)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Fit de mercado</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatNumber(project.artAnalysis?.marketFitScore ?? null)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tendência visual</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatNumber(project.artAnalysis?.visualTrendScore ?? null)}
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Evidências dos assets</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm md:grid-cols-3 xl:grid-cols-6">
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Assets enviados</p>
                    <p className="mt-2 text-2xl font-semibold">{uploadedArtAssets?.total ?? project.artAssets.length}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Imagens na proporção da loja</p>
                    <p className="mt-2 text-2xl font-semibold">{uploadedArtAssets?.capsuleRatio ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Score de evidência</p>
                    <p className="mt-2 text-2xl font-semibold">{formatNumber(uploadedArtAssets?.evidenceScore ?? null)}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Analisados por pixel</p>
                    <p className="mt-2 text-2xl font-semibold">{uploadedArtAssets?.pixelAnalyzed ?? project.artAssets.filter((asset) => asset.visualMetrics).length}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Legibilidade média</p>
                    <p className="mt-2 text-2xl font-semibold">{formatNumber(uploadedArtAssets?.averageReadabilityScore ?? null)}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Assets de alto risco</p>
                    <p className="mt-2 text-2xl font-semibold">{uploadedArtAssets?.highLegibilityRisk ?? 0}</p>
                  </div>
                </CardContent>
              </Card>
              {uploadedDominantColors.length ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Leitura do sinal visual</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 text-sm md:grid-cols-3">
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Contraste médio</p>
                      <p className="mt-2 text-2xl font-semibold">{uploadedArtAssets?.averageContrast ?? 0}</p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Saturação média</p>
                      <p className="mt-2 text-2xl font-semibold">{uploadedArtAssets?.averageSaturation ?? 0}</p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Cores dominantes</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {uploadedDominantColors.map((color) => (
                          <span key={color} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                            <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: color }} />
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Análise integrada de direção de arte</CardTitle>
                  <Button disabled={isAnalyzingArt} onClick={runArtAnalysis}>
                    {isAnalyzingArt ? t("projectDetail.analyzingArt") : project.artAnalysis ? t("projectDetail.refreshArtAnalysis") : t("projectDetail.runArtAnalysis")}
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Posicionamento de estilo</p>
                      <p className="mt-2 text-muted-foreground">
                        {project.artAnalysis?.styleSummary ?? t("projectDetail.artStyleFallback")}
                      </p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Fit de mercado</p>
                      <p className="mt-2 text-muted-foreground">
                        {project.artAnalysis?.fitSummary ?? t("projectDetail.artFitFallback")}
                      </p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Risco de produção</p>
                      <p className="mt-2 text-muted-foreground">
                        {project.artAnalysis?.productionSummary ?? t("projectDetail.artProductionFallback")}
                      </p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Recomendação</p>
                      <p className="mt-2 text-muted-foreground">
                        {project.artAnalysis?.recommendationSummary ?? t("projectDetail.artRecommendationFallback")}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Palavras-chave de paleta</p>
                      <p className="mt-2 text-muted-foreground">
                        {project.artAnalysis?.paletteKeywords?.join(", ") || "Análise pendente."}
                      </p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Palavras-chave de clima</p>
                      <p className="mt-2 text-muted-foreground">
                        {project.artAnalysis?.moodKeywords?.join(", ") || "Análise pendente."}
                      </p>
                    </div>
                  </div>
                  {isProArtAnalysis ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Prontidão de cápsula</p>
                        <p className="mt-2 text-2xl font-semibold">
                          {formatNumber(artMetadata?.proArtBrief?.capsuleReadinessScore ?? null)}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {artMetadata?.proArtBrief?.shelfGapSummary ?? "Rode a camada Pro de arte para pontuar prontidão de loja e lacuna de prateleira."}
                        </p>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Alavancas de produção</p>
                        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                          {proProductionLevers.map((item) => (
                            <p key={item}>• {item}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
              {artMetadata?.aiArtLayer ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Crítica visual da IA</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 text-sm">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Crítica visual</p>
                        <p className="mt-2 text-muted-foreground">{artMetadata.aiArtLayer.visualCritique}</p>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Avaliação de primeira leitura</p>
                        <p className="mt-2 text-muted-foreground">{artMetadata.aiArtLayer.firstReadAssessment}</p>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Conselho para cápsula</p>
                        <p className="mt-2 text-muted-foreground">{artMetadata.aiArtLayer.capsuleAdvice}</p>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Conselho de produção</p>
                        <p className="mt-2 text-muted-foreground">{artMetadata.aiArtLayer.productionAdvice}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Posicionamento de mercado</p>
                      <p className="mt-2 text-muted-foreground">{artMetadata.aiArtLayer.marketPositioningAdvice}</p>
                      <p className="mt-3 text-xs text-muted-foreground">{artMetadata.aiArtLayer.confidenceNarrative}</p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Correções prioritárias</p>
                        <div className="mt-2 space-y-2 text-muted-foreground">
                          {aiArtPriorityFixes.map((item) => (
                            <p key={item}>- {item}</p>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Pontos fortes</p>
                        <div className="mt-2 space-y-2 text-muted-foreground">
                          {aiArtStrengths.map((item) => (
                            <p key={item}>- {item}</p>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Riscos</p>
                        <div className="mt-2 space-y-2 text-muted-foreground">
                          {aiArtRisks.map((item) => (
                            <p key={item}>- {item}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : project.artAssets.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Crítica visual da IA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      A crítica com IA é opcional. Quando a IA estiver habilitada, a análise de arte vai revisar as imagens enviadas junto com os sinais visuais medidos.
                    </p>
                  </CardContent>
                </Card>
              ) : null}
              {isProArtAnalysis ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Benchmark Pro de prateleira</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {proReferenceShelf.length ? proReferenceShelf.map((item) => (
                      <div key={item.name} className="rounded-2xl border p-4">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Barra de reviews {formatPercent(item.reviewScore, 1)} · Preço {formatCurrency(item.priceCents)}
                          </p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground">{t("projectDetail.proBenchmarkFallback")}</p>
                    )}
                  </CardContent>
                </Card>
              ) : null}
              <Card>
                <CardHeader>
                  <CardTitle>Conjunto de referências de arte</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {project.competitorGames.length > 0 ? project.competitorGames.slice(0, 6).map((item) => (
                    <div key={item.steamGame.id} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-medium">{item.steamGame.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {(item.steamGame.genres.map((genre) => genre.steamGenre?.name).filter(Boolean).slice(0, 2).join(", ")) || t("projectDetail.noGenreCoverage")}
                            {" · "}
                            {(item.steamGame.tags.map((tag) => tag.steamTag?.name).filter(Boolean).slice(0, 3).join(", ")) || t("projectDetail.noTagCoverage")}
                          </p>
                        </div>
                        <p className="text-sm font-medium">
                          Barra de reviews: {formatPercent(item.steamGame.reviewScore ?? null, 1)}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">Rode a análise de mercado primeiro para montar o conjunto inicial de referências.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        <TabsContent value="milestones" className="space-y-4">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/25 p-1">
            <Button
              type="button"
              size="sm"
              variant={executionView === "board" ? "default" : "ghost"}
              onClick={() => setExecutionView("board")}
            >
              {t("projectDetail.executionBoardView")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={executionView === "milestones" ? "default" : "ghost"}
              onClick={() => setExecutionView("milestones")}
            >
              {t("projectDetail.executionMilestonesView")}
            </Button>
          </div>
          {executionView === "board" ? (
            <ProjectKanbanBoard
              projectName={project.name}
              board={board}
              search={kanbanSearch}
              setSearch={setKanbanSearch}
              assigneeFilter={kanbanAssigneeFilter}
              setAssigneeFilter={setKanbanAssigneeFilter}
              labelFilter={kanbanLabelFilter}
              setLabelFilter={setKanbanLabelFilter}
              newColumn={newColumn}
              setNewColumn={setNewColumn}
              createColumn={createColumn}
              updateColumn={updateColumn}
              moveColumn={moveColumn}
              deleteColumn={deleteColumn}
              newCards={newCards}
              setNewCards={setNewCards}
              cardEdits={cardEdits}
              setCardEdits={setCardEdits}
              createCard={createCard}
              saveCard={saveCard}
              moveCard={moveCard}
              moveCardInColumn={moveCardInColumn}
              deleteCard={deleteCard}
              reorderCard={reorderCard}
              assigneeOptions={assigneeOptions}
            />
          ) : (
            <>
              <DemoManagerPageClient
                projectId={projectId}
                sections={["Dependências", "Bugs e Bloqueios"]}
                showHeader={false}
              />
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Marcos</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatNumber(project.milestones.length)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Custo orçado</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatCurrency(milestoneBudgetTotal)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Receita esperada</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatCurrency(milestoneRevenueTotal)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Aprovações pendentes</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatNumber(pendingApprovalsCount)}
                  </CardContent>
                </Card>
              </div>
              <Card className="overflow-hidden">
                <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
                <CardHeader>
                  <CardTitle>Criar milestone</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Input value={newMilestone.title} onChange={(event) => setNewMilestone((current) => ({ ...current, title: event.target.value }))} placeholder="Vertical slice" />
                  <ProjectAssigneeSelect
                    value={newMilestone.ownerLabel}
                    onChange={(ownerLabel) => setNewMilestone((current) => ({ ...current, ownerLabel }))}
                    assigneeOptions={assigneeOptions}
                  />
                  <Select value={newMilestone.status} onValueChange={(value) => setNewMilestone((current) => ({ ...current, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["PLANNED", "IN_PROGRESS", "BLOCKED", "COMPLETED"].map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={newMilestone.dueAt} onChange={(event) => setNewMilestone((current) => ({ ...current, dueAt: event.target.value }))} />
                  <Input type="number" value={newMilestone.budgetedCostCents} onChange={(event) => setNewMilestone((current) => ({ ...current, budgetedCostCents: event.target.value }))} placeholder="Custo orçado em centavos" />
                  <Input type="number" value={newMilestone.expectedRevenueCents} onChange={(event) => setNewMilestone((current) => ({ ...current, expectedRevenueCents: event.target.value }))} placeholder="Receita esperada em centavos" />
                  <Textarea className="md:col-span-2" value={newMilestone.description} onChange={(event) => setNewMilestone((current) => ({ ...current, description: event.target.value }))} placeholder="Escopo do marco, critérios de aceite, notas de entrega..." />
                  <Button className="md:col-span-2" onClick={createMilestone}>Criar marco</Button>
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
                <CardHeader>
                  <CardTitle>Marcos do projeto e ponte financeira</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.milestones.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("projectDetail.noMilestones")}</p>
                  ) : (
                    project.milestones.map((milestone) => (
                      <div key={milestone.id} className="rounded-[1.5rem] border border-white/10 bg-white/45 p-4 backdrop-blur dark:bg-white/[0.03]">
                        <div className="grid gap-3 md:grid-cols-2">
                          <Input
                            value={milestoneEdits[milestone.id]?.title ?? milestone.title}
                            onChange={(event) => setMilestoneEdits((current) => ({
                              ...current,
                              [milestone.id]: {
                                title: event.target.value,
                                description: current[milestone.id]?.description ?? milestone.description ?? "",
                                ownerLabel: current[milestone.id]?.ownerLabel ?? milestone.ownerLabel ?? "",
                                status: current[milestone.id]?.status ?? milestone.status,
                                dueAt: current[milestone.id]?.dueAt ?? (milestone.dueAt ? new Date(milestone.dueAt).toISOString().slice(0, 10) : ""),
                                budgetedCostCents: current[milestone.id]?.budgetedCostCents ?? String(milestone.budgetedCostCents ?? 0),
                                expectedRevenueCents: current[milestone.id]?.expectedRevenueCents ?? String(milestone.expectedRevenueCents ?? 0)
                              }
                            }))}
                          />
                          <ProjectAssigneeSelect
                            value={milestoneEdits[milestone.id]?.ownerLabel ?? milestone.ownerLabel ?? ""}
                            onChange={(ownerLabel) => setMilestoneEdits((current) => ({
                              ...current,
                              [milestone.id]: {
                                title: current[milestone.id]?.title ?? milestone.title,
                                description: current[milestone.id]?.description ?? milestone.description ?? "",
                                ownerLabel,
                                status: current[milestone.id]?.status ?? milestone.status,
                                dueAt: current[milestone.id]?.dueAt ?? (milestone.dueAt ? new Date(milestone.dueAt).toISOString().slice(0, 10) : ""),
                                budgetedCostCents: current[milestone.id]?.budgetedCostCents ?? String(milestone.budgetedCostCents ?? 0),
                                expectedRevenueCents: current[milestone.id]?.expectedRevenueCents ?? String(milestone.expectedRevenueCents ?? 0)
                              }
                            }))}
                            assigneeOptions={assigneeOptions}
                          />
                          <Select
                            value={milestoneEdits[milestone.id]?.status ?? milestone.status}
                            onValueChange={(value) => setMilestoneEdits((current) => ({
                              ...current,
                              [milestone.id]: {
                                title: current[milestone.id]?.title ?? milestone.title,
                                description: current[milestone.id]?.description ?? milestone.description ?? "",
                                ownerLabel: current[milestone.id]?.ownerLabel ?? milestone.ownerLabel ?? "",
                                status: value,
                                dueAt: current[milestone.id]?.dueAt ?? (milestone.dueAt ? new Date(milestone.dueAt).toISOString().slice(0, 10) : ""),
                                budgetedCostCents: current[milestone.id]?.budgetedCostCents ?? String(milestone.budgetedCostCents ?? 0),
                                expectedRevenueCents: current[milestone.id]?.expectedRevenueCents ?? String(milestone.expectedRevenueCents ?? 0)
                              }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["PLANNED", "IN_PROGRESS", "BLOCKED", "COMPLETED"].map((status) => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="date"
                            value={milestoneEdits[milestone.id]?.dueAt ?? (milestone.dueAt ? new Date(milestone.dueAt).toISOString().slice(0, 10) : "")}
                            onChange={(event) => setMilestoneEdits((current) => ({
                              ...current,
                              [milestone.id]: {
                                title: current[milestone.id]?.title ?? milestone.title,
                                description: current[milestone.id]?.description ?? milestone.description ?? "",
                                ownerLabel: current[milestone.id]?.ownerLabel ?? milestone.ownerLabel ?? "",
                                status: current[milestone.id]?.status ?? milestone.status,
                                dueAt: event.target.value,
                                budgetedCostCents: current[milestone.id]?.budgetedCostCents ?? String(milestone.budgetedCostCents ?? 0),
                                expectedRevenueCents: current[milestone.id]?.expectedRevenueCents ?? String(milestone.expectedRevenueCents ?? 0)
                              }
                            }))}
                          />
                          <Input
                            type="number"
                            value={milestoneEdits[milestone.id]?.budgetedCostCents ?? String(milestone.budgetedCostCents ?? 0)}
                            onChange={(event) => setMilestoneEdits((current) => ({
                              ...current,
                              [milestone.id]: {
                                title: current[milestone.id]?.title ?? milestone.title,
                                description: current[milestone.id]?.description ?? milestone.description ?? "",
                                ownerLabel: current[milestone.id]?.ownerLabel ?? milestone.ownerLabel ?? "",
                                status: current[milestone.id]?.status ?? milestone.status,
                                dueAt: current[milestone.id]?.dueAt ?? (milestone.dueAt ? new Date(milestone.dueAt).toISOString().slice(0, 10) : ""),
                                budgetedCostCents: event.target.value,
                                expectedRevenueCents: current[milestone.id]?.expectedRevenueCents ?? String(milestone.expectedRevenueCents ?? 0)
                              }
                            }))}
                          />
                          <Input
                            type="number"
                            value={milestoneEdits[milestone.id]?.expectedRevenueCents ?? String(milestone.expectedRevenueCents ?? 0)}
                            onChange={(event) => setMilestoneEdits((current) => ({
                              ...current,
                              [milestone.id]: {
                                title: current[milestone.id]?.title ?? milestone.title,
                                description: current[milestone.id]?.description ?? milestone.description ?? "",
                                ownerLabel: current[milestone.id]?.ownerLabel ?? milestone.ownerLabel ?? "",
                                status: current[milestone.id]?.status ?? milestone.status,
                                dueAt: current[milestone.id]?.dueAt ?? (milestone.dueAt ? new Date(milestone.dueAt).toISOString().slice(0, 10) : ""),
                                budgetedCostCents: current[milestone.id]?.budgetedCostCents ?? String(milestone.budgetedCostCents ?? 0),
                                expectedRevenueCents: event.target.value
                              }
                            }))}
                          />
                          <Textarea
                            className="md:col-span-2"
                            value={milestoneEdits[milestone.id]?.description ?? milestone.description ?? ""}
                            onChange={(event) => setMilestoneEdits((current) => ({
                              ...current,
                              [milestone.id]: {
                                title: current[milestone.id]?.title ?? milestone.title,
                                description: event.target.value,
                                ownerLabel: current[milestone.id]?.ownerLabel ?? milestone.ownerLabel ?? "",
                                status: current[milestone.id]?.status ?? milestone.status,
                                dueAt: current[milestone.id]?.dueAt ?? (milestone.dueAt ? new Date(milestone.dueAt).toISOString().slice(0, 10) : ""),
                                budgetedCostCents: current[milestone.id]?.budgetedCostCents ?? String(milestone.budgetedCostCents ?? 0),
                                expectedRevenueCents: current[milestone.id]?.expectedRevenueCents ?? String(milestone.expectedRevenueCents ?? 0)
                              }
                            }))}
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm text-muted-foreground">
                            Orçamento {formatCurrency(milestone.budgetedCostCents)} · Receita {formatCurrency(milestone.expectedRevenueCents)}
                          </div>
                          <Button type="button" onClick={() => saveMilestone(milestone.id)}>{t("projectDetail.saveMilestone")}</Button>
                        </div>
                      </div>
                    ))
                  )}
                  {project.budgets.length > 0 ? (
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/45 p-4 backdrop-blur dark:bg-white/[0.03]">
                      <p className="font-medium">Snapshot do orçamento do projeto</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        {project.budgets.map((budget) => (
                          <div key={budget.id} className="rounded-xl border border-white/10 bg-background/75 p-3 text-sm">
                            <p className="font-medium">{budget.name}</p>
                            <p className="text-muted-foreground">{budget.status}</p>
                            <p className="mt-2">Planejado {formatCurrency(budget.totalPlannedCents)}</p>
                            <p>Realizado {formatCurrency(budget.lines.reduce((sum, line) => sum + line.actualCents, 0))}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        <TabsContent value="gdd" className="space-y-6">
          <Card className="overflow-hidden">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>GDD automatizado</CardTitle>
              <Button disabled={isGeneratingGdd} onClick={generateGdd}>
                {isGeneratingGdd ? "Gerando..." : latestGdd ? "Gerar novamente" : "Gerar GDD"}
              </Button>
            </CardHeader>
            <CardContent>
              {latestGdd ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {latestGdd.title} · Atualizado em {new Date(latestGdd.updatedAt).toLocaleString()}
                  </p>
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border bg-muted/30 p-4 text-sm">
                    {latestGdd.content}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Gere o primeiro GDD a partir do projeto atual e da análise de mercado.</p>
              )}
            </CardContent>
          </Card>
          <DemoManagerPageClient
            projectId={projectId}
            sections={["Personagens", "Itens", "Locais", "Diálogos", "Missões"]}
            showHeader={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

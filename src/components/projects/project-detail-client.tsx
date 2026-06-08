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
import { useProject } from "@/features/projects/hooks";
import { hasSubscriptionCapability } from "@/lib/subscription-plans";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

const stageOptions = [
  "DISCOVERY",
  "PRE_PRODUCTION",
  "PRODUCTION",
  "LIVE",
  "ARCHIVED"
] as const;

export function ProjectDetailClient({
  projectId,
  subscriptionPlan
}: {
  projectId: string;
  subscriptionPlan: SubscriptionPlan;
}) {
  const t = useI18n();
  const query = useProject(projectId);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingArt, setIsAnalyzingArt] = useState(false);
  const [isGeneratingGdd, setIsGeneratingGdd] = useState(false);
  const [projectForm, setProjectForm] = useState({
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
  const [columnEdits, setColumnEdits] = useState<Record<string, { name: string; color: string }>>({});
  const [cardEdits, setCardEdits] = useState<Record<string, {
    title: string;
    description: string;
    assigneeLabel: string;
    dueDate: string;
    labels: string;
  }>>({});

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
      stage: query.data.stage
    });

    const nextColumnEdits: Record<string, { name: string; color: string }> = {};

    for (const boardItem of query.data.kanbanBoards) {
      for (const column of boardItem.columns) {
        nextColumnEdits[column.id] = {
          name: column.name,
          color: column.color ?? ""
        };
      }
    }

    setColumnEdits(nextColumnEdits);

    const nextCardEdits: Record<string, {
      title: string;
      description: string;
      assigneeLabel: string;
      dueDate: string;
      labels: string;
    }> = {};

    for (const boardItem of query.data.kanbanBoards) {
      for (const column of boardItem.columns) {
        for (const card of column.cards) {
          nextCardEdits[card.id] = {
            title: card.title,
            description: card.description ?? "",
            assigneeLabel: card.assigneeLabel ?? "",
            dueDate: card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : "",
            labels: Array.isArray(card.labels) ? card.labels.join(", ") : ""
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

    for (const milestone of query.data.milestones) {
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

  const board = query.data?.kanbanBoards[0] ?? null;
  const columnOptions = useMemo(
    () => board?.columns.map((column) => ({ id: column.id, name: column.name })) ?? [],
    [board]
  );
  const latestGdd = query.data?.gdds[0] ?? null;
  const canRunArtAnalysis = hasSubscriptionCapability(subscriptionPlan, "artAnalyses");
  const isProArtAnalysis = subscriptionPlan === SubscriptionPlan.PRO;

  async function saveProject() {
    setFeedback(null);
    setIsSaving(true);

    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...projectForm,
        pricePointCents: projectForm.pricePointCents ? Number(projectForm.pricePointCents) : null
      })
    });

    setIsSaving(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? t("projectDetail.saveProjectError"));
      return;
    }

    setFeedback(t("projectDetail.projectSaved"));
    await query.refetch();
  }

  async function runAnalysis() {
    setFeedback(null);
    setIsAnalyzing(true);

    const response = await fetch(`/api/projects/${projectId}/analysis`, {
      method: "POST"
    });

    setIsAnalyzing(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? t("projectDetail.analyzeProjectError"));
      return;
    }

    setFeedback(t("projectDetail.marketAnalysisUpdated"));
    await query.refetch();
  }

  async function generateGdd() {
    setFeedback(null);
    setIsGeneratingGdd(true);

    const response = await fetch(`/api/projects/${projectId}/gdd`, {
      method: "POST"
    });

    setIsGeneratingGdd(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? t("projectDetail.generateGddError"));
      return;
    }

    setFeedback(t("projectDetail.gddGenerated"));
    await query.refetch();
  }

  async function runArtAnalysis() {
    setFeedback(null);
    setIsAnalyzingArt(true);

    const response = await fetch(`/api/projects/${projectId}/art-analysis`, {
      method: "POST"
    });

    setIsAnalyzingArt(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? t("projectDetail.artAnalysisError"));
      return;
    }

    setFeedback(t("projectDetail.artAnalysisUpdated"));
    await query.refetch();
  }

  async function createMilestone() {
    setFeedback(null);

    const response = await fetch(`/api/projects/${projectId}/milestones`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: newMilestone.title,
        description: newMilestone.description,
        ownerLabel: newMilestone.ownerLabel,
        status: newMilestone.status,
        dueAt: newMilestone.dueAt ? new Date(newMilestone.dueAt).toISOString() : undefined,
        budgetedCostCents: Number(newMilestone.budgetedCostCents || 0),
        expectedRevenueCents: Number(newMilestone.expectedRevenueCents || 0)
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? t("projectDetail.createMilestoneError"));
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

    const response = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: milestone.title,
        description: milestone.description,
        ownerLabel: milestone.ownerLabel,
        status: milestone.status,
        dueAt: milestone.dueAt ? new Date(milestone.dueAt).toISOString() : undefined,
        budgetedCostCents: Number(milestone.budgetedCostCents || 0),
        expectedRevenueCents: Number(milestone.expectedRevenueCents || 0)
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? t("projectDetail.saveMilestoneError"));
      return;
    }

    setFeedback(t("projectDetail.milestoneUpdated"));
    await query.refetch();
  }

  async function createColumn() {
    setFeedback(null);

    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "createColumn",
        name: newColumn.name,
        color: newColumn.color
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? t("projectDetail.createColumnError"));
      return;
    }

    setNewColumn({ name: "", color: "" });
    setFeedback(t("projectDetail.columnCreated"));
    await query.refetch();
  }

  async function updateColumn(columnId: string, name: string, color: string | null, sortOrder: number) {
    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "updateColumn",
        columnId,
        name,
        color,
        sortOrder
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? t("projectDetail.updateColumnError"));
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

    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "createCard",
        columnId,
        title: cardState.title,
        description: cardState.description,
        assigneeLabel: cardState.assigneeLabel,
        dueDate: cardState.dueDate ? new Date(cardState.dueDate).toISOString() : undefined,
        labels: cardState.labels
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? t("projectDetail.createCardError"));
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

    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "updateCard",
        cardId,
        title: cardState.title,
        description: cardState.description,
        assigneeLabel: cardState.assigneeLabel,
        dueDate: cardState.dueDate ? new Date(cardState.dueDate).toISOString() : null,
        labels: cardState.labels
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? t("projectDetail.saveCardError"));
      return;
    }

    setFeedback(t("projectDetail.cardUpdated"));
    await query.refetch();
  }

  async function moveCard(cardId: string, columnId: string) {
    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "updateCard",
        cardId,
        columnId
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? t("projectDetail.moveCardError"));
      return;
    }

    await query.refetch();
  }

  async function moveCardInColumn(cardId: string, direction: "up" | "down") {
    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "moveCard",
        cardId,
        direction
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? t("projectDetail.moveCardError"));
      return;
    }

    await query.refetch();
  }

  async function deleteCard(cardId: string) {
    const confirmed = window.confirm(t("projectDetail.deleteCardConfirm"));

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "deleteCard",
        cardId
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? t("projectDetail.deleteCardError"));
      return;
    }

    setFeedback(t("common.delete"));
    await query.refetch();
  }

  async function moveColumn(columnId: string, direction: "left" | "right") {
    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "moveColumn",
        columnId,
        direction
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? t("projectDetail.moveColumnError"));
      return;
    }

    await query.refetch();
  }

  async function deleteColumn(columnId: string) {
    const confirmed = window.confirm(t("projectDetail.deleteColumnConfirm"));

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "deleteColumn",
        columnId
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? t("projectDetail.deleteColumnError"));
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

  const project = query.data;
  const marketDepth = project.analysis?.metadata?.marketDepth ?? null;
  const competitionLayer = project.analysis?.metadata?.competitionLayer ?? null;
  const opportunityLayer = project.analysis?.metadata?.opportunityLayer ?? null;
  const projectFitLayer = project.analysis?.metadata?.projectFitLayer ?? null;
  const aiLayer = project.analysis?.metadata?.aiLayer ?? null;
  const milestoneBudgetTotal = project.milestones.reduce((sum, item) => sum + item.budgetedCostCents, 0);
  const milestoneRevenueTotal = project.milestones.reduce((sum, item) => sum + item.expectedRevenueCents, 0);
  const pendingApprovalsCount = project.approvalRequests.filter((item) => item.status === "PENDING").length;
  const artMetadata = (project.artAnalysis?.metadata ?? null) as {
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
  } | null;

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
              <Button disabled={isAnalyzing} onClick={runAnalysis}>
                {isAnalyzing ? t("projectDetail.analyzing") : t("projectDetail.runMarketAnalysis")}
              </Button>
              <Button disabled={isAnalyzingArt || !canRunArtAnalysis} variant="outline" onClick={runArtAnalysis}>
                {isAnalyzingArt ? t("projectDetail.analyzingArt") : t("projectDetail.runArtAnalysis")}
              </Button>
              <Button disabled={isGeneratingGdd} variant="outline" onClick={generateGdd}>
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
              <span className="text-muted-foreground">Stage</span>
              <span className="font-medium">{project.stage.replaceAll("_", " ")}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Milestones</span>
              <span className="font-medium">{formatNumber(project.milestones.length)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Pending approvals</span>
              <span className="font-medium">{formatNumber(pendingApprovalsCount)}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/35 p-3 dark:bg-white/[0.04]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{t("projectDetail.operatingMode")}</p>
              <p className="mt-2 font-medium">Use analysis, milestones, GDD, and board management as one connected execution loop.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-[1.5rem] border border-white/10 bg-white/55 p-2 backdrop-blur dark:bg-white/[0.04]">
          <TabsTrigger value="overview">{t("projectDetail.overviewTab")}</TabsTrigger>
          <TabsTrigger value="market">{t("projectDetail.marketTab")}</TabsTrigger>
          <TabsTrigger value="art">{t("projectDetail.artTab")}</TabsTrigger>
          <TabsTrigger value="milestones">{t("projectDetail.milestonesTab")}</TabsTrigger>
          <TabsTrigger value="gdd">{t("projectDetail.gddTab")}</TabsTrigger>
          <TabsTrigger value="kanban">{t("projectDetail.kanbanTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          <Card className="overflow-hidden">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader>
              <CardTitle>Project definition</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="detail-name">Project name</Label>
                <Input id="detail-name" value={projectForm.name} onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="detail-pitch">Elevator pitch</Label>
                <Textarea id="detail-pitch" value={projectForm.elevatorPitch} onChange={(event) => setProjectForm((current) => ({ ...current, elevatorPitch: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="detail-description">{t("common.description")}</Label>
                <Textarea id="detail-description" value={projectForm.description} onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-genres">Genres</Label>
                <Input id="detail-genres" value={projectForm.genreInput} onChange={(event) => setProjectForm((current) => ({ ...current, genreInput: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-tags">Tags</Label>
                <Input id="detail-tags" value={projectForm.tagInput} onChange={(event) => setProjectForm((current) => ({ ...current, tagInput: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-audience">Target audience</Label>
                <Textarea id="detail-audience" value={projectForm.targetAudience} onChange={(event) => setProjectForm((current) => ({ ...current, targetAudience: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-core-loop">Core loop</Label>
                <Textarea id="detail-core-loop" value={projectForm.coreLoop} onChange={(event) => setProjectForm((current) => ({ ...current, coreLoop: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-differentiator">Differentiator</Label>
                <Textarea id="detail-differentiator" value={projectForm.differentiator} onChange={(event) => setProjectForm((current) => ({ ...current, differentiator: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-fantasy">Player fantasy</Label>
                <Textarea id="detail-fantasy" value={projectForm.playerFantasy} onChange={(event) => setProjectForm((current) => ({ ...current, playerFantasy: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-monetization">Monetization</Label>
                <Input id="detail-monetization" value={projectForm.monetizationModel} onChange={(event) => setProjectForm((current) => ({ ...current, monetizationModel: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-art">Art direction</Label>
                <Input id="detail-art" value={projectForm.artDirection} onChange={(event) => setProjectForm((current) => ({ ...current, artDirection: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-price">Price target (cents)</Label>
                <Input id="detail-price" value={projectForm.pricePointCents} onChange={(event) => setProjectForm((current) => ({ ...current, pricePointCents: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={projectForm.stage} onValueChange={(value) => setProjectForm((current) => ({ ...current, stage: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stageOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button disabled={isSaving} onClick={saveProject}>
                  {isSaving ? t("projectDetail.saving") : t("projectDetail.saveProject")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="market" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Opportunity</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatNumber(opportunityLayer?.opportunityScore ?? null)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatNumber(opportunityLayer?.riskScore ?? null)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Direct comps</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatNumber(competitionLayer?.directComparableCount ?? project.analysis?.competitionCount ?? null)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Median revenue</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatCurrency(project.analysis?.medianRevenueCents ?? null)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Market confidence</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatNumber(marketDepth?.confidenceScore ?? null)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project fit</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatNumber(projectFitLayer?.overallFitScore ?? null)}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Integrated market analysis</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <p>{project.analysis?.marketSummary ?? "Run market analysis to populate this section."}</p>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Opportunity</p>
                    <p className="mt-2 text-muted-foreground">{project.analysis?.opportunitySummary ?? "Pending analysis."}</p>
                  </div>
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Risk</p>
                  <p className="mt-2 text-muted-foreground">{project.analysis?.riskSummary ?? "Pending analysis."}</p>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Autofill audience</p>
                  <p className="mt-2 text-muted-foreground">{project.analysis?.audienceAutofill ?? "Pending analysis."}</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Autofill core loop</p>
                  <p className="mt-2 text-muted-foreground">{project.analysis?.coreLoopAutofill ?? "Pending analysis."}</p>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Suggested genres</p>
                  <p className="mt-2 text-muted-foreground">
                    {project.analysis?.suggestedGenres?.join(", ") || "Pending analysis."}
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Suggested tags</p>
                  <p className="mt-2 text-muted-foreground">
                    {project.analysis?.suggestedTags?.join(", ") || "Pending analysis."}
                  </p>
                  </div>
                </div>
                {aiLayer ? (
                  <>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">AI strategic read</p>
                        <p className="mt-2 text-muted-foreground">{aiLayer.strategicNarrative}</p>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Positioning wedge</p>
                        <p className="mt-2 text-muted-foreground">{aiLayer.positioningSummary}</p>
                      </div>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Launch strategy</p>
                        <p className="mt-2 text-muted-foreground">{aiLayer.launchStrategy}</p>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Pricing and offer design</p>
                        <p className="mt-2 text-muted-foreground">{aiLayer.pricingNarrative}</p>
                      </div>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Store capsule and messaging</p>
                        <p className="mt-2 text-muted-foreground">{aiLayer.storeCapsuleAdvice}</p>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">AI confidence read</p>
                        <p className="mt-2 text-muted-foreground">{aiLayer.confidenceNarrative}</p>
                      </div>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Creative angles</p>
                        <ul className="mt-2 space-y-2 text-muted-foreground">
                          {aiLayer.creativeAngles.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Acquisition channels</p>
                        <ul className="mt-2 space-y-2 text-muted-foreground">
                          {aiLayer.acquisitionChannels.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Wishlist drivers</p>
                        <ul className="mt-2 space-y-2 text-muted-foreground">
                          {aiLayer.wishlistDrivers.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">AI red flags</p>
                        <ul className="mt-2 space-y-2 text-muted-foreground">
                          {aiLayer.redFlags.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Market depth</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Market size</p>
                    <p className="mt-2 text-foreground">
                      {marketDepth ? `${marketDepth.marketSizeLabel} · ${formatCurrency(marketDepth.marketSizeCents)}` : "Pending analysis."}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Review velocity</p>
                    <p className="mt-2 text-foreground">
                      {marketDepth ? `${formatNumber(marketDepth.reviewVelocity90)} vs ${formatNumber(marketDepth.previousReviewVelocity90)} previous 90d` : "Pending analysis."}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Player momentum</p>
                    <p className="mt-2 text-foreground">
                      {marketDepth ? `${formatNumber(marketDepth.playerMomentum30)} avg vs ${formatNumber(marketDepth.previousPlayerMomentum30)}` : "Pending analysis."}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Launch cohorts</p>
                    <p className="mt-2 text-foreground">
                      {marketDepth ? `${marketDepth.launchCohorts.last90Days} / 90d · ${marketDepth.launchCohorts.last180Days} / 180d · ${marketDepth.launchCohorts.last365Days} / 365d` : "Pending analysis."}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4 md:col-span-2">
                    <p className="font-medium">Price distribution</p>
                    <p className="mt-2 text-foreground">
                      {marketDepth
                        ? `<$10: ${marketDepth.priceBandDistribution.under10} · $10-20: ${marketDepth.priceBandDistribution.between10And20} · $20-30: ${marketDepth.priceBandDistribution.between20And30} · $30+: ${marketDepth.priceBandDistribution.over30}`
                        : "Pending analysis."}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Competition layer</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Direct vs adjacent</p>
                    <p className="mt-2 text-foreground">
                      {competitionLayer ? `${competitionLayer.directComparableCount} direct · ${competitionLayer.adjacentComparableCount} adjacent` : "Pending analysis."}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Crowdedness</p>
                    <p className="mt-2 text-foreground">
                      {formatNumber(competitionLayer?.crowdednessScore ?? null)}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Revenue concentration</p>
                    <p className="mt-2 text-foreground">
                      {competitionLayer ? `${competitionLayer.winnerConcentrationScore}% in top winners` : "Pending analysis."}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Quality bar</p>
                    <p className="mt-2 text-foreground">
                      {formatNumber(competitionLayer?.qualityBarScore ?? null)}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4 md:col-span-2">
                    <p className="font-medium">Monetization mix</p>
                    <p className="mt-2 text-foreground">
                      {competitionLayer ? `${competitionLayer.dominantMonetization} dominant · ${competitionLayer.premiumSharePercent}% premium share` : "Pending analysis."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Opportunity layer</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Underserved score</p>
                    <p className="mt-2 text-foreground">{formatNumber(opportunityLayer?.underservedScore ?? null)}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Revenue potential</p>
                    <p className="mt-2 text-foreground">{formatNumber(opportunityLayer?.revenuePotentialScore ?? null)}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Execution bar</p>
                    <p className="mt-2 text-foreground">{formatNumber(opportunityLayer?.executionBarScore ?? null)}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Confidence</p>
                    <p className="mt-2 text-foreground">
                      {marketDepth ? `${marketDepth.confidenceLabel} (${marketDepth.confidenceScore})` : "Pending analysis."}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4 md:col-span-2">
                    <p className="font-medium">Practical recommendations</p>
                    <ul className="mt-2 space-y-2 text-muted-foreground">
                      {opportunityLayer?.practicalRecommendations?.length ? opportunityLayer.practicalRecommendations.map((item) => (
                        <li key={item}>- {item}</li>
                      )) : <li>Pending analysis.</li>}
                    </ul>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Project fit layer</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Genre/tag fit</p>
                    <p className="mt-2 text-foreground">{formatNumber(projectFitLayer?.genreTagCoverageScore ?? null)}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Price fit</p>
                    <p className="mt-2 text-foreground">{formatNumber(projectFitLayer?.priceFitScore ?? null)}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Monetization fit</p>
                    <p className="mt-2 text-foreground">{formatNumber(projectFitLayer?.monetizationFitScore ?? null)}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Positioning clarity</p>
                    <p className="mt-2 text-foreground">{formatNumber(projectFitLayer?.positioningClarityScore ?? null)}</p>
                  </div>
                  <div className="rounded-2xl border p-4 md:col-span-2">
                    <p className="font-medium">Key mismatches</p>
                    <ul className="mt-2 space-y-2 text-muted-foreground">
                      {opportunityLayer?.keyMismatches?.length ? opportunityLayer.keyMismatches.map((item) => (
                        <li key={item}>- {item}</li>
                      )) : <li>{t("projectDetail.noMismatches")}</li>}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Comparable Steam games</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {project.competitorGames.length > 0 ? project.competitorGames.map((item) => (
                <div key={item.steamGame.id} className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-medium">{item.steamGame.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Reviews: {formatNumber(item.steamGame.reviewCount)} · Score: {formatPercent(item.steamGame.reviewScore ?? null, 1)}
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
                  Upgrade to Plus or Pro to benchmark visual positioning, production complexity, and art-market fit
                  directly inside each project.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Distinctiveness</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatNumber(project.artAnalysis?.distinctivenessScore ?? null)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Production complexity</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatNumber(project.artAnalysis?.productionComplexityScore ?? null)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Market fit</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatNumber(project.artAnalysis?.marketFitScore ?? null)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Visual trend</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatNumber(project.artAnalysis?.visualTrendScore ?? null)}
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Integrated art direction analysis</CardTitle>
                  <Button disabled={isAnalyzingArt} onClick={runArtAnalysis}>
                    {isAnalyzingArt ? t("projectDetail.analyzingArt") : project.artAnalysis ? t("projectDetail.refreshArtAnalysis") : t("projectDetail.runArtAnalysis")}
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Style position</p>
                      <p className="mt-2 text-muted-foreground">
                        {project.artAnalysis?.styleSummary ?? t("projectDetail.artStyleFallback")}
                      </p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Market fit</p>
                      <p className="mt-2 text-muted-foreground">
                        {project.artAnalysis?.fitSummary ?? t("projectDetail.artFitFallback")}
                      </p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Production risk</p>
                      <p className="mt-2 text-muted-foreground">
                        {project.artAnalysis?.productionSummary ?? t("projectDetail.artProductionFallback")}
                      </p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Recommendation</p>
                      <p className="mt-2 text-muted-foreground">
                        {project.artAnalysis?.recommendationSummary ?? t("projectDetail.artRecommendationFallback")}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Palette keywords</p>
                      <p className="mt-2 text-muted-foreground">
                        {project.artAnalysis?.paletteKeywords?.join(", ") || "Pending analysis."}
                      </p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Mood keywords</p>
                      <p className="mt-2 text-muted-foreground">
                        {project.artAnalysis?.moodKeywords?.join(", ") || "Pending analysis."}
                      </p>
                    </div>
                  </div>
                  {isProArtAnalysis ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Capsule readiness</p>
                        <p className="mt-2 text-2xl font-semibold">
                          {formatNumber(artMetadata?.proArtBrief?.capsuleReadinessScore ?? null)}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {artMetadata?.proArtBrief?.shelfGapSummary ?? "Run the Pro art layer to score store-readiness and shelf gap."}
                        </p>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Production levers</p>
                        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                          {(artMetadata?.proArtBrief?.productionLevers ?? ["Run the Pro art layer to receive execution levers for scope and store-facing polish."]).map((item) => (
                            <p key={item}>• {item}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
              {isProArtAnalysis ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Pro shelf benchmark</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {artMetadata?.proArtBrief?.referenceShelf?.length ? artMetadata.proArtBrief.referenceShelf.map((item) => (
                      <div key={item.name} className="rounded-2xl border p-4">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Review bar {formatPercent(item.reviewScore, 1)} · Price {formatCurrency(item.priceCents)}
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
                  <CardTitle>Art reference set</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {project.competitorGames.length > 0 ? project.competitorGames.slice(0, 6).map((item) => (
                    <div key={item.steamGame.id} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-medium">{item.steamGame.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {(item.steamGame.genres.map((genre) => genre.steamGenre.name).slice(0, 2).join(", ")) || t("projectDetail.noGenreCoverage")}
                            {" · "}
                            {(item.steamGame.tags.map((tag) => tag.steamTag.name).slice(0, 3).join(", ")) || t("projectDetail.noTagCoverage")}
                          </p>
                        </div>
                        <p className="text-sm font-medium">
                          Review bar: {formatPercent(item.steamGame.reviewScore ?? null, 1)}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">Run market analysis first to build the initial reference set.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        <TabsContent value="milestones" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Milestones</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatNumber(project.milestones.length)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Budgeted cost</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatCurrency(milestoneBudgetTotal)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Expected revenue</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatCurrency(milestoneRevenueTotal)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Pending approvals</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatNumber(pendingApprovalsCount)}
              </CardContent>
            </Card>
          </div>
          <Card className="overflow-hidden">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader>
              <CardTitle>Create milestone</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Input value={newMilestone.title} onChange={(event) => setNewMilestone((current) => ({ ...current, title: event.target.value }))} placeholder="Vertical slice" />
              <Input value={newMilestone.ownerLabel} onChange={(event) => setNewMilestone((current) => ({ ...current, ownerLabel: event.target.value }))} placeholder={t("common.owner")} />
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
              <Input type="number" value={newMilestone.budgetedCostCents} onChange={(event) => setNewMilestone((current) => ({ ...current, budgetedCostCents: event.target.value }))} placeholder="Budgeted cost cents" />
              <Input type="number" value={newMilestone.expectedRevenueCents} onChange={(event) => setNewMilestone((current) => ({ ...current, expectedRevenueCents: event.target.value }))} placeholder="Expected revenue cents" />
              <Textarea className="md:col-span-2" value={newMilestone.description} onChange={(event) => setNewMilestone((current) => ({ ...current, description: event.target.value }))} placeholder="Milestone scope, acceptance criteria, delivery notes..." />
              <Button className="md:col-span-2" onClick={createMilestone}>Create milestone</Button>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader>
              <CardTitle>Project milestones and finance bridge</CardTitle>
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
                      <Input
                        value={milestoneEdits[milestone.id]?.ownerLabel ?? milestone.ownerLabel ?? ""}
                        onChange={(event) => setMilestoneEdits((current) => ({
                          ...current,
                          [milestone.id]: {
                            title: current[milestone.id]?.title ?? milestone.title,
                            description: current[milestone.id]?.description ?? milestone.description ?? "",
                            ownerLabel: event.target.value,
                            status: current[milestone.id]?.status ?? milestone.status,
                            dueAt: current[milestone.id]?.dueAt ?? (milestone.dueAt ? new Date(milestone.dueAt).toISOString().slice(0, 10) : ""),
                            budgetedCostCents: current[milestone.id]?.budgetedCostCents ?? String(milestone.budgetedCostCents ?? 0),
                            expectedRevenueCents: current[milestone.id]?.expectedRevenueCents ?? String(milestone.expectedRevenueCents ?? 0)
                          }
                        }))}
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
                        Budget {formatCurrency(milestone.budgetedCostCents)} · Revenue {formatCurrency(milestone.expectedRevenueCents)}
                      </div>
                      <Button type="button" onClick={() => saveMilestone(milestone.id)}>{t("projectDetail.saveMilestone")}</Button>
                    </div>
                  </div>
                ))
              )}
              {project.budgets.length > 0 ? (
                <div className="rounded-[1.5rem] border border-white/10 bg-white/45 p-4 backdrop-blur dark:bg-white/[0.03]">
                  <p className="font-medium">Project budget snapshot</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {project.budgets.map((budget) => (
                      <div key={budget.id} className="rounded-xl border border-white/10 bg-background/75 p-3 text-sm">
                        <p className="font-medium">{budget.name}</p>
                        <p className="text-muted-foreground">{budget.status}</p>
                        <p className="mt-2">Planned {formatCurrency(budget.totalPlannedCents)}</p>
                        <p>Actual {formatCurrency(budget.lines.reduce((sum, line) => sum + line.actualCents, 0))}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="gdd" className="space-y-6">
          <Card className="overflow-hidden">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Automated GDD</CardTitle>
              <Button disabled={isGeneratingGdd} onClick={generateGdd}>
                {isGeneratingGdd ? "Generating..." : latestGdd ? "Regenerate" : "Generate GDD"}
              </Button>
            </CardHeader>
            <CardContent>
              {latestGdd ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {latestGdd.title} · Updated {new Date(latestGdd.updatedAt).toLocaleString()}
                  </p>
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border bg-muted/30 p-4 text-sm">
                    {latestGdd.content}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Generate the first GDD from the current project and market analysis.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="kanban" className="space-y-6">
          <Card className="overflow-hidden">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader>
              <CardTitle>{t("projectDetail.customizeBoard")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px_120px]">
              <Input
                value={newColumn.name}
                onChange={(event) => setNewColumn((current) => ({ ...current, name: event.target.value }))}
                placeholder={t("projectDetail.newColumnName")}
              />
              <Input
                value={newColumn.color}
                onChange={(event) => setNewColumn((current) => ({ ...current, color: event.target.value }))}
                placeholder="#0ea5e9"
              />
              <Button onClick={createColumn}>{t("projectDetail.addColumn")}</Button>
            </CardContent>
          </Card>
          <div className="grid gap-4 xl:grid-cols-4">
            {board?.columns.map((column, index) => (
              <Card key={column.id} className="h-fit overflow-hidden">
                <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: column.color || "#64748b" }} />
                    <Input
                      value={columnEdits[column.id]?.name ?? column.name}
                      onChange={(event) => setColumnEdits((current) => ({
                        ...current,
                        [column.id]: {
                          name: event.target.value,
                          color: current[column.id]?.color ?? column.color ?? ""
                        }
                      }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={columnEdits[column.id]?.color ?? column.color ?? ""}
                      onChange={(event) => setColumnEdits((current) => ({
                        ...current,
                        [column.id]: {
                          name: current[column.id]?.name ?? column.name,
                          color: event.target.value
                        }
                      }))}
                      placeholder="#64748b"
                    />
                    <Button
                      variant="outline"
                      onClick={() => updateColumn(
                        column.id,
                        columnEdits[column.id]?.name ?? column.name,
                        columnEdits[column.id]?.color ?? column.color,
                        index
                      )}
                    >
                      {t("common.save")}
                    </Button>
                    <Button size="sm" type="button" variant="outline" onClick={() => moveColumn(column.id, "left")}>
                      ←
                    </Button>
                    <Button size="sm" type="button" variant="outline" onClick={() => moveColumn(column.id, "right")}>
                      →
                    </Button>
                    <Button size="sm" type="button" variant="destructive" onClick={() => deleteColumn(column.id)}>
                      {t("common.delete")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {column.cards.map((card) => (
                    <div key={card.id} className="rounded-[1.25rem] border border-white/10 bg-white/45 p-3 backdrop-blur dark:bg-white/[0.03]">
                      <div className="grid gap-3">
                        <Input
                          value={cardEdits[card.id]?.title ?? card.title}
                          onChange={(event) => setCardEdits((current) => ({
                            ...current,
                            [card.id]: {
                              title: event.target.value,
                              description: current[card.id]?.description ?? card.description ?? "",
                              assigneeLabel: current[card.id]?.assigneeLabel ?? card.assigneeLabel ?? "",
                              dueDate: current[card.id]?.dueDate ?? (card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : ""),
                              labels: current[card.id]?.labels ?? (Array.isArray(card.labels) ? card.labels.join(", ") : "")
                            }
                          }))}
                        />
                        <Textarea
                          value={cardEdits[card.id]?.description ?? card.description ?? ""}
                          onChange={(event) => setCardEdits((current) => ({
                            ...current,
                            [card.id]: {
                              title: current[card.id]?.title ?? card.title,
                              description: event.target.value,
                              assigneeLabel: current[card.id]?.assigneeLabel ?? card.assigneeLabel ?? "",
                              dueDate: current[card.id]?.dueDate ?? (card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : ""),
                              labels: current[card.id]?.labels ?? (Array.isArray(card.labels) ? card.labels.join(", ") : "")
                            }
                          }))}
                          placeholder={t("common.description")}
                        />
                        <Input
                          value={cardEdits[card.id]?.assigneeLabel ?? card.assigneeLabel ?? ""}
                          onChange={(event) => setCardEdits((current) => ({
                            ...current,
                            [card.id]: {
                              title: current[card.id]?.title ?? card.title,
                              description: current[card.id]?.description ?? card.description ?? "",
                              assigneeLabel: event.target.value,
                              dueDate: current[card.id]?.dueDate ?? (card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : ""),
                              labels: current[card.id]?.labels ?? (Array.isArray(card.labels) ? card.labels.join(", ") : "")
                            }
                          }))}
                          placeholder={t("common.owner")}
                        />
                        <Input
                          type="date"
                          value={cardEdits[card.id]?.dueDate ?? (card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : "")}
                          onChange={(event) => setCardEdits((current) => ({
                            ...current,
                            [card.id]: {
                              title: current[card.id]?.title ?? card.title,
                              description: current[card.id]?.description ?? card.description ?? "",
                              assigneeLabel: current[card.id]?.assigneeLabel ?? card.assigneeLabel ?? "",
                              dueDate: event.target.value,
                              labels: current[card.id]?.labels ?? (Array.isArray(card.labels) ? card.labels.join(", ") : "")
                            }
                          }))}
                        />
                        <Input
                          value={cardEdits[card.id]?.labels ?? (Array.isArray(card.labels) ? card.labels.join(", ") : "")}
                          onChange={(event) => setCardEdits((current) => ({
                            ...current,
                            [card.id]: {
                              title: current[card.id]?.title ?? card.title,
                              description: current[card.id]?.description ?? card.description ?? "",
                              assigneeLabel: current[card.id]?.assigneeLabel ?? card.assigneeLabel ?? "",
                              dueDate: current[card.id]?.dueDate ?? (card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : ""),
                              labels: event.target.value
                            }
                          }))}
                          placeholder={t("projectDetail.labelsPlaceholder")}
                        />
                        <Select value={column.id} onValueChange={(value) => moveCard(card.id, value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {columnOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" type="button" variant="outline" onClick={() => moveCardInColumn(card.id, "up")}>
                            ↑
                          </Button>
                          <Button size="sm" type="button" variant="outline" onClick={() => moveCardInColumn(card.id, "down")}>
                            ↓
                          </Button>
                          <Button size="sm" type="button" variant="outline" onClick={() => saveCard(card.id)}>
                            {t("projectDetail.saveCard")}
                          </Button>
                          <Button size="sm" type="button" variant="destructive" onClick={() => deleteCard(card.id)}>
                            {t("common.delete")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-[1.25rem] border border-dashed border-white/15 bg-white/30 p-3 dark:bg-white/[0.02]">
                    <div className="grid gap-2">
                      <Input
                        value={newCards[column.id]?.title ?? ""}
                        onChange={(event) => setNewCards((current) => ({
                          ...current,
                          [column.id]: {
                            title: event.target.value,
                            description: current[column.id]?.description ?? "",
                            assigneeLabel: current[column.id]?.assigneeLabel ?? "",
                            dueDate: current[column.id]?.dueDate ?? "",
                            labels: current[column.id]?.labels ?? ""
                          }
                        }))}
                        placeholder={t("projectDetail.newCardTitle")}
                      />
                      <Textarea
                        value={newCards[column.id]?.description ?? ""}
                        onChange={(event) => setNewCards((current) => ({
                          ...current,
                          [column.id]: {
                            title: current[column.id]?.title ?? "",
                            description: event.target.value,
                            assigneeLabel: current[column.id]?.assigneeLabel ?? "",
                            dueDate: current[column.id]?.dueDate ?? "",
                            labels: current[column.id]?.labels ?? ""
                          }
                        }))}
                        placeholder={t("projectDetail.cardDescription")}
                      />
                      <Input
                        value={newCards[column.id]?.assigneeLabel ?? ""}
                        onChange={(event) => setNewCards((current) => ({
                          ...current,
                          [column.id]: {
                            title: current[column.id]?.title ?? "",
                            description: current[column.id]?.description ?? "",
                            assigneeLabel: event.target.value,
                            dueDate: current[column.id]?.dueDate ?? "",
                            labels: current[column.id]?.labels ?? ""
                          }
                        }))}
                        placeholder={t("common.owner")}
                      />
                      <Input
                        type="date"
                        value={newCards[column.id]?.dueDate ?? ""}
                        onChange={(event) => setNewCards((current) => ({
                          ...current,
                          [column.id]: {
                            title: current[column.id]?.title ?? "",
                            description: current[column.id]?.description ?? "",
                            assigneeLabel: current[column.id]?.assigneeLabel ?? "",
                            dueDate: event.target.value,
                            labels: current[column.id]?.labels ?? ""
                          }
                        }))}
                      />
                      <Input
                        value={newCards[column.id]?.labels ?? ""}
                        onChange={(event) => setNewCards((current) => ({
                          ...current,
                          [column.id]: {
                            title: current[column.id]?.title ?? "",
                            description: current[column.id]?.description ?? "",
                            assigneeLabel: current[column.id]?.assigneeLabel ?? "",
                            dueDate: current[column.id]?.dueDate ?? "",
                            labels: event.target.value
                          }
                        }))}
                        placeholder={t("projectDetail.labelsPlaceholder")}
                      />
                      <Button variant="outline" onClick={() => createCard(column.id)}>
                        {t("projectDetail.addCard")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

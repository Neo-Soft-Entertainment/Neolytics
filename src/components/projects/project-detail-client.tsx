"use client";

import { SubscriptionPlan } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ProjectKanbanBoard } from "@/components/projects/project-kanban-board";
import { DemoManagerPageClient } from "@/features/demo-manager/demo-manager-page-client";
import { useEntitlements } from "@/features/entitlements/hooks";
import { ProjectAssigneeSelect } from "@/features/projects/components/project-assignee-select";
import { ProjectOverviewForm } from "@/features/projects/components/project-overview-form";
import { type ProjectDetailResponse, useProject } from "@/features/projects/hooks";
import {
  createProjectKanbanCard,
  createProjectKanbanColumn,
  createProjectKanbanView,
  createProjectMilestone,
  deleteProjectArtAsset,
  deleteProjectKanbanCard,
  deleteProjectKanbanColumn,
  deleteProjectKanbanView,
  generateProjectGdd,
  moveProjectKanbanCard,
  moveProjectKanbanCardInColumn,
  moveProjectKanbanColumn,
  reorderProjectKanbanCard,
  runProjectAnalysis,
  runProjectArtAnalysis,
  saveProjectKanbanCard,
  updateProjectKanbanColumn,
  updateProjectKanbanView,
  saveProjectMilestone,
  saveProjectOverview,
  uploadProjectArtAsset
} from "@/features/projects/services/project-detail-api";
import type { ProjectKanbanCardDraft, ProjectKanbanViewDraft, ProjectMilestoneDraft } from "@/features/projects/services/project-detail-api";
import type { ProjectOverviewFormState } from "@/features/projects/types";
import { cn, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

type ProjectMilestoneItem = ProjectDetailResponse["milestones"][number];
type ProjectKanbanBoardItem = ProjectDetailResponse["kanbanBoards"][number];
type ProjectKanbanColumnItem = ProjectKanbanBoardItem["columns"][number];
type ProjectKanbanCardItem = ProjectKanbanColumnItem["cards"][number];
type ProductionPlannerView = "calendar" | "timeline" | "board";
type ProductionPlannerRange = "week" | "month" | "year";
type ProductionPlannerGroupBy = "type" | "status" | "owner" | "source";
type ProductionPlannerSortBy = "date" | "title" | "status" | "owner";
type ProductionPlannerSortDirection = "asc" | "desc";
type ProductionPlannerTypeFilter = "all" | "meeting" | "milestone" | "deadline" | "task";
type ProductionPlannerPropertyKey = "date" | "owner" | "status" | "source" | "description";
type ProductionPlannerPropertyVisibility = Record<ProductionPlannerPropertyKey, boolean>;

type ProductionPlannerItem = {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date;
  ownerLabel: string | null;
  status: string;
  type: "meeting" | "milestone" | "deadline" | "task";
  source: "milestone" | "kanban";
  sourceLabel: string;
};

function getProjectQueryKey(projectId: string) {
  return ["projects", projectId] as const;
}

function parseDraftLabels(labels: string) {
  return labels
    .split(",")
    .map((item: any) => item.trim())
    .filter(Boolean);
}

function parseCents(value: string) {
  const parsed = Number(value || 0);

  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return 0;
}

function toDraftIsoDate(value: string) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function toMilestoneStatus(status: string): ProjectMilestoneItem["status"] {
  if (status === "IN_PROGRESS") {
    return "IN_PROGRESS";
  }

  if (status === "BLOCKED") {
    return "BLOCKED";
  }

  if (status === "COMPLETED") {
    return "COMPLETED";
  }

  return "PLANNED";
}

function toProjectStage(stage: string): ProjectDetailResponse["stage"] {
  if (stage === "PRE_PRODUCTION") {
    return "PRE_PRODUCTION";
  }

  if (stage === "PRODUCTION") {
    return "PRODUCTION";
  }

  if (stage === "LIVE") {
    return "LIVE";
  }

  if (stage === "ARCHIVED") {
    return "ARCHIVED";
  }

  return "DISCOVERY";
}

function getDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getPlannerItemType(title: string, labels: string[]) {
  const searchable = `${title} ${labels.join(" ")}`.toLowerCase();

  if (searchable.includes("meeting") || searchable.includes("reuni")) {
    return "meeting" as const;
  }

  if (searchable.includes("deadline") || searchable.includes("due") || searchable.includes("entrega")) {
    return "deadline" as const;
  }

  return "task" as const;
}

function getPlannerRange(referenceDate: Date, range: ProductionPlannerRange) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  if (range === "week") {
    const day = start.getDay();
    let offset = 1 - day;

    if (day === 0) {
      offset = -6;
    }

    start.setDate(start.getDate() + offset);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }

  if (range === "year") {
    start.setMonth(0, 1);
    const end = new Date(start);
    end.setFullYear(start.getFullYear() + 1);
    return { start, end };
  }

  start.setDate(1);
  const end = new Date(start);
  end.setMonth(start.getMonth() + 1);
  return { start, end };
}

function getPlannerGroupLabel(item: ProductionPlannerItem, groupBy: ProductionPlannerGroupBy) {
  if (groupBy === "status") {
    return item.status || "No status";
  }

  if (groupBy === "owner") {
    return item.ownerLabel || "No owner";
  }

  if (groupBy === "source") {
    return item.sourceLabel || "No source";
  }

  if (item.type === "meeting") {
    return "Meetings";
  }

  if (item.type === "milestone") {
    return "Milestones";
  }

  if (item.type === "deadline") {
    return "Deadlines";
  }

  return "Tasks";
}

function comparePlannerItems(left: ProductionPlannerItem, right: ProductionPlannerItem, sortBy: ProductionPlannerSortBy) {
  if (sortBy === "title") {
    return left.title.localeCompare(right.title);
  }

  if (sortBy === "status") {
    return left.status.localeCompare(right.status);
  }

  if (sortBy === "owner") {
    return (left.ownerLabel ?? "").localeCompare(right.ownerLabel ?? "");
  }

  return left.dueAt.getTime() - right.dueAt.getTime();
}

function normalizeCardOrders(cards: ProjectKanbanCardItem[]) {
  return cards.map((card, index) => ({
    ...card,
    sortOrder: index
  }));
}

function normalizeColumnOrders(columns: ProjectKanbanColumnItem[]) {
  return columns.map((column, index) => ({
    ...column,
    sortOrder: index
  }));
}

function reorderCardInProject(
  project: ProjectDetailResponse,
  cardId: string,
  targetColumnId: string,
  targetIndex: number,
  replacementCard?: ProjectKanbanCardItem
) {
  let movingCard: ProjectKanbanCardItem | null = null;

  const boardsWithoutCard = project.kanbanBoards.map((boardItem) => ({
    ...boardItem,
    columns: boardItem.columns.map((column) => {
      const cards: ProjectKanbanCardItem[] = [];

      for (const card of column.cards) {
        if (card.id === cardId) {
          movingCard = card;

          if (replacementCard) {
            movingCard = replacementCard;
          }

          continue;
        }

        cards.push(card);
      }

      return {
        ...column,
        cards: normalizeCardOrders(cards)
      };
    })
  }));

  if (!movingCard) {
    return project;
  }

  const cardToInsert = movingCard;
  let foundTargetColumn = false;

  const kanbanBoards = boardsWithoutCard.map((boardItem) => ({
    ...boardItem,
    columns: boardItem.columns.map((column) => {
      if (column.id !== targetColumnId) {
        return column;
      }

      foundTargetColumn = true;
      const cards = [...column.cards];
      let nextIndex = targetIndex;

      if (nextIndex < 0) {
        nextIndex = 0;
      }

      if (nextIndex > cards.length) {
        nextIndex = cards.length;
      }

      cards.splice(nextIndex, 0, cardToInsert);

      return {
        ...column,
        cards: normalizeCardOrders(cards)
      };
    })
  }));

  if (!foundTargetColumn) {
    return project;
  }

  return {
    ...project,
    kanbanBoards
  };
}

function addCardToProject(project: ProjectDetailResponse, columnId: string, card: ProjectKanbanCardItem) {
  return {
    ...project,
    kanbanBoards: project.kanbanBoards.map((boardItem) => ({
      ...boardItem,
      columns: boardItem.columns.map((column) => {
        if (column.id !== columnId) {
          return column;
        }

        return {
          ...column,
          cards: normalizeCardOrders([...column.cards, card])
        };
      })
    }))
  };
}

function removeCardFromProject(project: ProjectDetailResponse, cardId: string) {
  return {
    ...project,
    kanbanBoards: project.kanbanBoards.map((boardItem) => ({
      ...boardItem,
      columns: boardItem.columns.map((column) => ({
        ...column,
        cards: normalizeCardOrders(column.cards.filter((card) => card.id !== cardId))
      }))
    }))
  };
}

function updateColumnInProject(
  project: ProjectDetailResponse,
  columnId: string,
  name: string,
  color: string | null,
  sortOrder: number
) {
  return {
    ...project,
    kanbanBoards: project.kanbanBoards.map((boardItem) => ({
      ...boardItem,
      columns: normalizeColumnOrders(boardItem.columns.map((column) => {
        if (column.id !== columnId) {
          return column;
        }

        return {
          ...column,
          name,
          color,
          sortOrder
        };
      }))
    }))
  };
}

function addColumnToProject(project: ProjectDetailResponse, column: ProjectKanbanColumnItem) {
  return {
    ...project,
    kanbanBoards: project.kanbanBoards.map((boardItem, index) => {
      if (index > 0) {
        return boardItem;
      }

      return {
        ...boardItem,
        columns: normalizeColumnOrders([...boardItem.columns, column])
      };
    })
  };
}

function removeColumnFromProject(project: ProjectDetailResponse, columnId: string) {
  return {
    ...project,
    kanbanBoards: project.kanbanBoards.map((boardItem) => ({
      ...boardItem,
      columns: normalizeColumnOrders(boardItem.columns.filter((column) => column.id !== columnId))
    }))
  };
}

function moveColumnInProject(project: ProjectDetailResponse, columnId: string, direction: "left" | "right") {
  let moved = false;

  return {
    ...project,
    kanbanBoards: project.kanbanBoards.map((boardItem) => {
      if (moved) {
        return boardItem;
      }

      const columnIndex = boardItem.columns.findIndex((column) => column.id === columnId);

      if (columnIndex < 0) {
        return boardItem;
      }

      let targetIndex = columnIndex + 1;

      if (direction === "left") {
        targetIndex = columnIndex - 1;
      }

      if (targetIndex < 0 || targetIndex >= boardItem.columns.length) {
        return boardItem;
      }

      const columns = [...boardItem.columns];
      const currentColumn = columns[columnIndex];
      const targetColumn = columns[targetIndex];

      if (!currentColumn || !targetColumn) {
        return boardItem;
      }

      columns[columnIndex] = targetColumn;
      columns[targetIndex] = currentColumn;
      moved = true;

      return {
        ...boardItem,
        columns: normalizeColumnOrders(columns)
      };
    })
  };
}

function moveCardOneSlotInProject(project: ProjectDetailResponse, cardId: string, direction: "up" | "down") {
  for (const boardItem of project.kanbanBoards) {
    for (const column of boardItem.columns) {
      const currentIndex = column.cards.findIndex((card) => card.id === cardId);

      if (currentIndex < 0) {
        continue;
      }

      let targetIndex = currentIndex + 1;

      if (direction === "up") {
        targetIndex = currentIndex - 1;
      }

      return reorderCardInProject(project, cardId, column.id, targetIndex);
    }
  }

  return project;
}

function toOptimisticMilestone(id: string, milestone: ProjectMilestoneDraft, sortOrder: number): ProjectMilestoneItem {
  return {
    id,
    title: milestone.title.trim(),
    description: milestone.description.trim() || null,
    ownerLabel: milestone.ownerLabel.trim() || null,
    status: toMilestoneStatus(milestone.status),
    dueAt: toDraftIsoDate(milestone.dueAt),
    completedAt: null,
    budgetedCostCents: parseCents(milestone.budgetedCostCents),
    expectedRevenueCents: parseCents(milestone.expectedRevenueCents),
    sortOrder
  };
}

function toOptimisticCard(id: string, cardState: ProjectKanbanCardDraft, sortOrder: number): ProjectKanbanCardItem {
  return {
    id,
    title: cardState.title.trim(),
    description: cardState.description.trim() || null,
    assigneeLabel: cardState.assigneeLabel.trim() || null,
    dueDate: toDraftIsoDate(cardState.dueDate),
    labels: parseDraftLabels(cardState.labels),
    sortOrder
  };
}

export function ProjectDetailClient({
  projectId,
  subscriptionPlan
}: {
  projectId: string;
  subscriptionPlan: SubscriptionPlan;
}) {
  const t = useI18n();
  const queryClient = useQueryClient();
  const query = useProject(projectId);
  const entitlements = useEntitlements();
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
  const [plannerView, setPlannerView] = useState<ProductionPlannerView>("calendar");
  const [plannerRange, setPlannerRange] = useState<ProductionPlannerRange>("week");
  const [plannerReferenceDate, setPlannerReferenceDate] = useState(getDateInputValue(new Date()));
  const [plannerSearch, setPlannerSearch] = useState("");
  const [plannerTypeFilter, setPlannerTypeFilter] = useState<ProductionPlannerTypeFilter>("all");
  const [plannerGroupBy, setPlannerGroupBy] = useState<ProductionPlannerGroupBy>("type");
  const [plannerSortBy, setPlannerSortBy] = useState<ProductionPlannerSortBy>("date");
  const [plannerSortDirection, setPlannerSortDirection] = useState<ProductionPlannerSortDirection>("asc");
  const [plannerVisibleProperties, setPlannerVisibleProperties] = useState<ProductionPlannerPropertyVisibility>({
    date: true,
    owner: true,
    status: true,
    source: true,
    description: true
  });
  const [artAssetForm, setArtAssetForm] = useState({
    kind: "capsule",
    notes: ""
  });

  useEffect(() => {
    if (!query.data) {
      return;
    }

        let resolvedValue0: any;
    if (query.data.pricePointCents) {
      resolvedValue0 = String(query.data.pricePointCents);
    } else {
      resolvedValue0 = "";
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
      pricePointCents: resolvedValue0,
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
                    let resolvedValue1: any;
          if (card.dueDate) {
            resolvedValue1 = new Date(card.dueDate).toISOString().slice(0, 10);
          } else {
            resolvedValue1 = "";
          }
          let resolvedValue2: any;
          if (Array.isArray(card.labels)) {
            resolvedValue2 = card.labels.join(", ");
          } else {
            resolvedValue2 = "";
          }
nextCardEdits[card.id] = {
            title: card.title,
            description: card.description ?? "",
            assigneeLabel: card.assigneeLabel ?? "",
            dueDate: resolvedValue1,
            labels: resolvedValue2,
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
            let resolvedValue3: any;
      if (milestone.dueAt) {
        resolvedValue3 = new Date(milestone.dueAt).toISOString().slice(0, 10);
      } else {
        resolvedValue3 = "";
      }
nextMilestoneEdits[milestone.id] = {
        title: milestone.title,
        description: milestone.description ?? "",
        ownerLabel: milestone.ownerLabel ?? "",
        status: milestone.status,
        dueAt: resolvedValue3,
        budgetedCostCents: String(milestone.budgetedCostCents ?? 0),
        expectedRevenueCents: String(milestone.expectedRevenueCents ?? 0)
      };
    }

    setMilestoneEdits(nextMilestoneEdits);
  }, [query.data]);

  const canRunArtAnalysis = entitlements.canUse("artAnalysis");
  const isProArtAnalysis = entitlements.canUse("earlyAccess");

  function getProjectSnapshot() {
    return queryClient.getQueryData<ProjectDetailResponse>(getProjectQueryKey(projectId));
  }

  function updateProjectCache(update: (current: ProjectDetailResponse) => ProjectDetailResponse) {
    queryClient.setQueryData<ProjectDetailResponse>(getProjectQueryKey(projectId), (current: any) => {
      if (!current) {
        return current;
      }

      return update(current);
    });
  }

  function restoreProjectCache(previousData: ProjectDetailResponse | undefined) {
    if (!previousData) {
      return;
    }

    queryClient.setQueryData(getProjectQueryKey(projectId), previousData);
  }

  function refreshProjectCache() {
    void queryClient.invalidateQueries({
      queryKey: getProjectQueryKey(projectId),
      exact: true
    });
  }

  async function saveProject() {
    setFeedback(null);
    setIsSaving(true);
    const previousData = getProjectSnapshot();
    let pricePointCents: number | null = null;

    if (projectForm.pricePointCents) {
      pricePointCents = Number(projectForm.pricePointCents);
    }

    updateProjectCache((current: any) => ({
      ...current,
      name: projectForm.name.trim(),
      elevatorPitch: projectForm.elevatorPitch.trim() || null,
      description: projectForm.description.trim() || null,
      genreInput: projectForm.genreInput.trim() || null,
      tagInput: projectForm.tagInput.trim() || null,
      targetAudience: projectForm.targetAudience.trim() || null,
      coreLoop: projectForm.coreLoop.trim() || null,
      differentiator: projectForm.differentiator.trim() || null,
      monetizationModel: projectForm.monetizationModel.trim() || null,
      artDirection: projectForm.artDirection.trim() || null,
      playerFantasy: projectForm.playerFantasy.trim() || null,
      pricePointCents,
      stage: toProjectStage(projectForm.stage)
    }));

    const result = await saveProjectOverview(projectId, projectForm);

    setIsSaving(false);

    if (!result.ok) {
      restoreProjectCache(previousData);
      setFeedback(result.message ?? t("projectDetail.saveProjectError"));
      return;
    }

    setFeedback(t("projectDetail.projectSaved"));
    refreshProjectCache();
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
    refreshProjectCache();
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
    refreshProjectCache();
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
    refreshProjectCache();
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
    refreshProjectCache();
  }

  async function deleteArtAsset(assetId: string) {
    setFeedback(null);
    const previousData = getProjectSnapshot();

    updateProjectCache((current: any) => ({
      ...current,
      artAssets: current.artAssets.filter((asset: any) => asset.id !== assetId)
    }));

    const result = await deleteProjectArtAsset(projectId, assetId);

    if (!result.ok) {
      restoreProjectCache(previousData);
      setFeedback(result.message ?? "Não foi possível excluir o asset de arte.");
      return;
    }

    setFeedback("Asset de arte excluído.");
    refreshProjectCache();
  }

  async function createMilestone() {
    setFeedback(null);

    if (!newMilestone.title.trim()) {
      setFeedback(t("projectDetail.milestoneTitleRequired"));
      return;
    }

    const submittedMilestone = newMilestone;
    const previousData = getProjectSnapshot();
    let sortOrder = 0;

    if (previousData) {
      sortOrder = previousData.milestones.length;
    }

    const optimisticMilestone = toOptimisticMilestone(`optimistic-milestone-${Date.now()}`, submittedMilestone, sortOrder);

    updateProjectCache((current: any) => ({
      ...current,
      milestones: [...current.milestones, optimisticMilestone]
    }));
    setNewMilestone({
      title: "",
      description: "",
      ownerLabel: "",
      status: "PLANNED",
      dueAt: "",
      budgetedCostCents: "",
      expectedRevenueCents: ""
    });

    const result = await createProjectMilestone(projectId, submittedMilestone);

    if (!result.ok) {
      restoreProjectCache(previousData);
      setNewMilestone(submittedMilestone);
      setFeedback(result.message ?? t("projectDetail.createMilestoneError"));
      return;
    }

    setFeedback(t("projectDetail.milestoneCreated"));
    refreshProjectCache();
  }

  async function saveMilestone(milestoneId: string) {
    const milestone = milestoneEdits[milestoneId];

    if (!milestone?.title.trim()) {
      setFeedback(t("projectDetail.milestoneTitleRequired"));
      return;
    }

    const previousData = getProjectSnapshot();
    const optimisticMilestone = toOptimisticMilestone(milestoneId, milestone, 0);

    updateProjectCache((current: any) => ({
      ...current,
      milestones: current.milestones.map((currentMilestone: any) => {
        if (currentMilestone.id !== milestoneId) {
          return currentMilestone;
        }

        return {
          ...currentMilestone,
          ...optimisticMilestone,
          sortOrder: currentMilestone.sortOrder
        };
      })
    }));

    const result = await saveProjectMilestone(projectId, milestoneId, milestone);

    if (!result.ok) {
      restoreProjectCache(previousData);
      setFeedback(result.message ?? t("projectDetail.saveMilestoneError"));
      return;
    }

    setFeedback(t("projectDetail.milestoneUpdated"));
    refreshProjectCache();
  }

  async function createColumn() {
    setFeedback(null);

    if (!newColumn.name.trim()) {
      setFeedback(t("projectDetail.createColumnError"));
      return;
    }

    const submittedColumn = newColumn;
    const previousData = getProjectSnapshot();
    let sortOrder = 0;

    if (previousData?.kanbanBoards[0]) {
      sortOrder = previousData.kanbanBoards[0].columns.length;
    }

    const optimisticColumn: ProjectKanbanColumnItem = {
      id: `optimistic-column-${Date.now()}`,
      name: submittedColumn.name.trim(),
      color: submittedColumn.color.trim() || null,
      sortOrder,
      cards: []
    };

    updateProjectCache((current: any) => addColumnToProject(current, optimisticColumn));
    setNewColumn({ name: "", color: "" });

    const result = await createProjectKanbanColumn(projectId, submittedColumn.name, submittedColumn.color);

    if (!result.ok) {
      restoreProjectCache(previousData);
      setNewColumn(submittedColumn);
      setFeedback(result.message ?? t("projectDetail.createColumnError"));
      return;
    }

    setFeedback(t("projectDetail.columnCreated"));
    refreshProjectCache();
  }

  async function updateColumn(columnId: string, name: string, color: string | null, sortOrder: number) {
    const previousData = getProjectSnapshot();
    let nextColor = color;

    if (nextColor !== null && !nextColor.trim()) {
      nextColor = null;
    }

    updateProjectCache((current: any) => updateColumnInProject(current, columnId, name.trim(), nextColor, sortOrder));

    const result = await updateProjectKanbanColumn(projectId, columnId, name, color, sortOrder);

    if (!result.ok) {
      restoreProjectCache(previousData);
      setFeedback(result.message ?? t("projectDetail.updateColumnError"));
      return;
    }

    setFeedback(t("projectDetail.columnUpdated"));
    refreshProjectCache();
  }

  async function createView(view: ProjectKanbanViewDraft) {
    setFeedback(null);

    const result = await createProjectKanbanView(projectId, view);

    if (!result.ok) {
      setFeedback(result.message ?? "Não foi possível criar a view.");
      return false;
    }

    setFeedback("View criada.");
    refreshProjectCache();
    return true;
  }

  async function updateView(viewId: string, view: ProjectKanbanViewDraft) {
    setFeedback(null);

    const result = await updateProjectKanbanView(projectId, viewId, view);

    if (!result.ok) {
      setFeedback(result.message ?? "Não foi possível salvar a view.");
      return false;
    }

    setFeedback("View salva.");
    refreshProjectCache();
    return true;
  }

  async function deleteView(viewId: string) {
    const confirmed = window.confirm("Excluir esta view?");

    if (!confirmed) {
      return false;
    }

    const result = await deleteProjectKanbanView(projectId, viewId);

    if (!result.ok) {
      setFeedback(result.message ?? "Não foi possível excluir a view.");
      return false;
    }

    setFeedback("View excluída.");
    refreshProjectCache();
    return true;
  }

  async function createCard(columnId: string) {
    const cardState = newCards[columnId];

    if (!cardState?.title?.trim()) {
      setFeedback(t("projectDetail.cardTitleRequired"));
      return;
    }

    const previousData = getProjectSnapshot();
    const previousNewCards = newCards;
    let sortOrder = 0;

    if (previousData) {
      for (const boardItem of previousData.kanbanBoards) {
        for (const column of boardItem.columns) {
          if (column.id === columnId) {
            sortOrder = column.cards.length;
          }
        }
      }
    }

    const optimisticCard = toOptimisticCard(`optimistic-card-${Date.now()}`, cardState, sortOrder);

    updateProjectCache((current: any) => addCardToProject(current, columnId, optimisticCard));
    setNewCards((current: any) => ({
      ...current,
      [columnId]: {
        title: "",
        description: "",
        assigneeLabel: "",
        dueDate: "",
        labels: ""
      }
    }));

    const result = await createProjectKanbanCard(projectId, columnId, cardState);

    if (!result.ok) {
      restoreProjectCache(previousData);
      setNewCards(previousNewCards);
      setFeedback(result.message ?? t("projectDetail.createCardError"));
      return;
    }

    setFeedback(t("projectDetail.cardCreated"));
    refreshProjectCache();
  }

  async function saveCard(cardId: string) {
    const cardState = cardEdits[cardId];

    if (!cardState?.title.trim()) {
      setFeedback(t("projectDetail.cardTitleRequired"));
      return;
    }

    const previousData = getProjectSnapshot();

    updateProjectCache((current: any) => {
      let sourceCard: ProjectKanbanCardItem | null = null;
      let sourceColumnId = cardState.columnId;

      for (const boardItem of current.kanbanBoards) {
        for (const column of boardItem.columns) {
          for (const card of column.cards) {
            if (card.id !== cardId) {
              continue;
            }

            sourceCard = card;
            sourceColumnId = column.id;
          }
        }
      }

      if (!sourceCard) {
        return current;
      }

      const optimisticCard = toOptimisticCard(cardId, cardState, sourceCard.sortOrder);

      return reorderCardInProject(current, cardId, cardState.columnId, sourceCard.sortOrder, optimisticCard);
    });

    const result = await saveProjectKanbanCard(projectId, cardId, cardState);

    if (!result.ok) {
      restoreProjectCache(previousData);
      setFeedback(result.message ?? t("projectDetail.saveCardError"));
      return;
    }

    setFeedback(t("projectDetail.cardUpdated"));
    refreshProjectCache();
  }

  async function moveCard(cardId: string, columnId: string) {
    const result = await moveProjectKanbanCard(projectId, cardId, columnId);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.moveCardError"));
      return false;
    }

    updateProjectCache((current: any) => reorderCardInProject(current, cardId, columnId, Number.MAX_SAFE_INTEGER));
    return true;
  }

  async function moveCardInColumn(cardId: string, direction: "up" | "down") {
    const result = await moveProjectKanbanCardInColumn(projectId, cardId, direction);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.moveCardError"));
      return false;
    }

    updateProjectCache((current: any) => moveCardOneSlotInProject(current, cardId, direction));
    return true;
  }

  async function reorderCard(cardId: string, columnId: string, targetIndex: number) {
    const result = await reorderProjectKanbanCard(projectId, cardId, columnId, targetIndex);

    if (!result.ok) {
      setFeedback(result.message ?? t("projectDetail.moveCardError"));
      return false;
    }

    updateProjectCache((current: any) => reorderCardInProject(current, cardId, columnId, targetIndex));
    return true;
  }

  async function deleteCard(cardId: string) {
    const confirmed = window.confirm(t("projectDetail.deleteCardConfirm"));

    if (!confirmed) {
      return;
    }

    const previousData = getProjectSnapshot();

    updateProjectCache((current: any) => removeCardFromProject(current, cardId));

    const result = await deleteProjectKanbanCard(projectId, cardId);

    if (!result.ok) {
      restoreProjectCache(previousData);
      setFeedback(result.message ?? t("projectDetail.deleteCardError"));
      return;
    }

    setFeedback(t("common.delete"));
    refreshProjectCache();
  }

  async function moveColumn(columnId: string, direction: "left" | "right") {
    const previousData = getProjectSnapshot();

    updateProjectCache((current: any) => moveColumnInProject(current, columnId, direction));

    const result = await moveProjectKanbanColumn(projectId, columnId, direction);

    if (!result.ok) {
      restoreProjectCache(previousData);
      setFeedback(result.message ?? t("projectDetail.moveColumnError"));
      return;
    }

    refreshProjectCache();
  }

  async function deleteColumn(columnId: string) {
    const confirmed = window.confirm(t("projectDetail.deleteColumnConfirm"));

    if (!confirmed) {
      return;
    }

    const previousData = getProjectSnapshot();

    updateProjectCache((current: any) => removeColumnFromProject(current, columnId));

    const result = await deleteProjectKanbanColumn(projectId, columnId);

    if (!result.ok) {
      restoreProjectCache(previousData);
      setFeedback(result.message ?? t("projectDetail.deleteColumnError"));
      return;
    }

    setFeedback(t("common.delete"));
    refreshProjectCache();
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
    artAssets: (query.data.artAssets ?? []).map((asset: any) => ({
      ...asset,
      kind: asset.kind ?? "asset",
      originalName: asset.originalName ?? "Asset",
      sizeBytes: asset.sizeBytes ?? 0
    })),
    competitorGames: (query.data.competitorGames ?? []).filter((item: any) => item?.steamGame).map((item: any) => ({
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
    let resolvedValue4: any;
  if (Array.isArray(opportunityLayer?.practicalRecommendations)) {
    resolvedValue4 = opportunityLayer.practicalRecommendations;
  } else {
    resolvedValue4 = [];
  }
const opportunityRecommendations = resolvedValue4;
    let resolvedValue5: any;
  if (Array.isArray(opportunityLayer?.keyMismatches)) {
    resolvedValue5 = opportunityLayer.keyMismatches;
  } else {
    resolvedValue5 = [];
  }
const opportunityMismatches = resolvedValue5;
    let resolvedValue6: any;
  if (Array.isArray(aiLayer?.creativeAngles)) {
    resolvedValue6 = aiLayer.creativeAngles;
  } else {
    resolvedValue6 = [];
  }
const aiCreativeAngles = resolvedValue6;
    let resolvedValue7: any;
  if (Array.isArray(aiLayer?.acquisitionChannels)) {
    resolvedValue7 = aiLayer.acquisitionChannels;
  } else {
    resolvedValue7 = [];
  }
const aiAcquisitionChannels = resolvedValue7;
    let resolvedValue8: any;
  if (Array.isArray(aiLayer?.wishlistDrivers)) {
    resolvedValue8 = aiLayer.wishlistDrivers;
  } else {
    resolvedValue8 = [];
  }
const aiWishlistDrivers = resolvedValue8;
    let resolvedValue9: any;
  if (Array.isArray(aiLayer?.redFlags)) {
    resolvedValue9 = aiLayer.redFlags;
  } else {
    resolvedValue9 = [];
  }
const aiRedFlags = resolvedValue9;
  const hybridProbabilities = hybridMarketIntelligence?.probabilisticAssessment?.probabilities ?? {};
    let resolvedValue10: any;
  if (Array.isArray(hybridMarketIntelligence?.opportunityScoring?.factors)) {
    resolvedValue10 = hybridMarketIntelligence.opportunityScoring.factors;
  } else {
    resolvedValue10 = [];
  }
const hybridFactors = resolvedValue10;
    let resolvedValue11: any;
  if (Array.isArray(hybridMarketIntelligence?.trendDetection?.emergingTags)) {
    resolvedValue11 = hybridMarketIntelligence.trendDetection.emergingTags;
  } else {
    resolvedValue11 = [];
  }
const hybridEmergingTags = resolvedValue11;
    let resolvedValue12: any;
  if (Array.isArray(hybridMarketIntelligence?.trendDetection?.decliningSignals)) {
    resolvedValue12 = hybridMarketIntelligence.trendDetection.decliningSignals;
  } else {
    resolvedValue12 = [];
  }
const hybridDecliningSignals = resolvedValue12;
    let resolvedValue13: any;
  if (Array.isArray(hybridMarketIntelligence?.competitiveIntelligence?.marketLeaders)) {
    resolvedValue13 = hybridMarketIntelligence.competitiveIntelligence.marketLeaders;
  } else {
    resolvedValue13 = [];
  }
const hybridMarketLeaders = resolvedValue13;
    let resolvedValue14: any;
  if (Array.isArray(hybridMarketIntelligence?.competitiveIntelligence?.recentlySuccessfulLaunches)) {
    resolvedValue14 = hybridMarketIntelligence.competitiveIntelligence.recentlySuccessfulLaunches;
  } else {
    resolvedValue14 = [];
  }
const hybridSuccessfulLaunches = resolvedValue14;
    let resolvedValue15: any;
  if (Array.isArray(hybridMarketIntelligence?.competitiveIntelligence?.failedLaunches)) {
    resolvedValue15 = hybridMarketIntelligence.competitiveIntelligence.failedLaunches;
  } else {
    resolvedValue15 = [];
  }
const hybridFailedLaunches = resolvedValue15;
    let resolvedValue16: any;
  if (Array.isArray(hybridMarketIntelligence?.evidenceTrail)) {
    resolvedValue16 = hybridMarketIntelligence.evidenceTrail;
  } else {
    resolvedValue16 = [];
  }
const hybridEvidenceTrail = resolvedValue16;
    let resolvedValue17: any;
  if (Array.isArray(hybridMarketIntelligence?.sourcesUsed)) {
    resolvedValue17 = hybridMarketIntelligence.sourcesUsed;
  } else {
    resolvedValue17 = [];
  }
const hybridSourcesUsed = resolvedValue17;
    let resolvedValue18: any;
  if (Array.isArray(hybridMarketIntelligence?.dataQuality?.limitations)) {
    resolvedValue18 = hybridMarketIntelligence.dataQuality.limitations;
  } else {
    resolvedValue18 = [];
  }
const hybridLimitations = resolvedValue18;
  const milestoneBudgetTotal = project.milestones.reduce((sum, item) => sum + item.budgetedCostCents, 0);
  const milestoneRevenueTotal = project.milestones.reduce((sum, item) => sum + item.expectedRevenueCents, 0);
  const pendingApprovalsCount = project.approvalRequests.filter((item: any) => item.status === "PENDING").length;
  const productionPlanner = useMemo(() => {
    const referenceDate = new Date(`${plannerReferenceDate}T00:00:00`);
    let validReferenceDate = referenceDate;

    if (Number.isNaN(referenceDate.getTime())) {
      validReferenceDate = new Date();
    }

    const { start, end } = getPlannerRange(validReferenceDate, plannerRange);
    const items: ProductionPlannerItem[] = [];

    for (const milestone of project.milestones) {
      if (!milestone.dueAt) {
        continue;
      }

      items.push({
        id: `milestone:${milestone.id}`,
        title: milestone.title,
        description: milestone.description,
        dueAt: new Date(milestone.dueAt),
        ownerLabel: milestone.ownerLabel,
        status: milestone.status,
        type: "milestone",
        source: "milestone",
        sourceLabel: "Milestone"
      });
    }

    for (const column of board?.columns ?? []) {
      for (const card of column.cards) {
        if (!card.dueDate) {
          continue;
        }

        let labels: string[] = [];

        if (Array.isArray(card.labels)) {
          labels = card.labels;
        }

        items.push({
          id: `card:${card.id}`,
          title: card.title,
          description: card.description,
          dueAt: new Date(card.dueDate),
          ownerLabel: card.assigneeLabel,
          status: column.name,
          type: getPlannerItemType(card.title, labels),
          source: "kanban",
          sourceLabel: column.name
        });
      }
    }

    const normalizedPlannerSearch = plannerSearch.trim().toLowerCase();
    let visibleItems = items.filter((item) => item.dueAt >= start && item.dueAt < end);

    if (plannerTypeFilter !== "all") {
      visibleItems = visibleItems.filter((item) => item.type === plannerTypeFilter);
    }

    if (normalizedPlannerSearch) {
      visibleItems = visibleItems.filter((item) => [
        item.title,
        item.description,
        item.ownerLabel,
        item.status,
        item.sourceLabel,
        item.type
      ].filter(Boolean).join(" ").toLowerCase().includes(normalizedPlannerSearch));
    }

    visibleItems = [...visibleItems].sort((left, right) => {
      const result = comparePlannerItems(left, right, plannerSortBy);

      if (plannerSortDirection === "desc") {
        return result * -1;
      }

      return result;
    });

    const buckets: Array<{ key: string; label: string; items: ProductionPlannerItem[] }> = [];

    if (plannerRange === "year") {
      for (let month = 0; month < 12; month += 1) {
        const date = new Date(start.getFullYear(), month, 1);
        buckets.push({
          key: `${start.getFullYear()}-${String(month + 1).padStart(2, "0")}`,
          label: date.toLocaleString(undefined, { month: "short" }),
          items: []
        });
      }
    } else {
      const cursor = new Date(start);

      while (cursor < end) {
        buckets.push({
          key: getDateInputValue(cursor),
          label: cursor.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
          items: []
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    for (const item of visibleItems) {
      let key = getDateInputValue(item.dueAt);

      if (plannerRange === "year") {
        key = `${item.dueAt.getFullYear()}-${String(item.dueAt.getMonth() + 1).padStart(2, "0")}`;
      }

      const bucket = buckets.find((current) => current.key === key);

      if (bucket) {
        bucket.items.push(item);
      }
    }

    const boardGroupMap = new Map<string, { key: string; label: string; items: ProductionPlannerItem[] }>();

    for (const item of visibleItems) {
      const label = getPlannerGroupLabel(item, plannerGroupBy);
      const key = label.toLowerCase().replaceAll(" ", "-");
      const current = boardGroupMap.get(key);

      if (current) {
        current.items.push(item);
        continue;
      }

      boardGroupMap.set(key, {
        key,
        label,
        items: [item]
      });
    }

    const boardGroups = Array.from(boardGroupMap.values()).sort((left, right) => left.label.localeCompare(right.label));

    return {
      start,
      end,
      items: visibleItems,
      buckets,
      boardGroups,
      meetings: visibleItems.filter((item) => item.type === "meeting").length,
      milestones: visibleItems.filter((item) => item.type === "milestone").length,
      deadlines: visibleItems.filter((item) => item.type === "deadline").length
    };
  }, [
    board,
    plannerGroupBy,
    plannerRange,
    plannerReferenceDate,
    plannerSearch,
    plannerSortBy,
    plannerSortDirection,
    plannerTypeFilter,
    project.milestones
  ]);
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
    let resolvedValue19: any;
  if (Array.isArray(uploadedArtAssets?.dominantColors)) {
    resolvedValue19 = uploadedArtAssets.dominantColors;
  } else {
    resolvedValue19 = [];
  }
const uploadedDominantColors = resolvedValue19;
    let resolvedValue20: any;
  if (Array.isArray(artMetadata?.proArtBrief?.productionLevers)) {
    resolvedValue20 = artMetadata.proArtBrief.productionLevers;
  } else {
    resolvedValue20 = ["Rode a camada Pro de arte para receber alavancas de execução para escopo e polimento de loja."];
  }
const proProductionLevers = resolvedValue20;
    let resolvedValue21: any;
  if (Array.isArray(artMetadata?.proArtBrief?.referenceShelf)) {
    resolvedValue21 = artMetadata.proArtBrief.referenceShelf;
  } else {
    resolvedValue21 = [];
  }
const proReferenceShelf = resolvedValue21;
    let resolvedValue22: any;
  if (Array.isArray(artMetadata?.aiArtLayer?.priorityFixes)) {
    resolvedValue22 = artMetadata.aiArtLayer.priorityFixes;
  } else {
    resolvedValue22 = [];
  }
const aiArtPriorityFixes = resolvedValue22;
    let resolvedValue23: any;
  if (Array.isArray(artMetadata?.aiArtLayer?.strengths)) {
    resolvedValue23 = artMetadata.aiArtLayer.strengths;
  } else {
    resolvedValue23 = [];
  }
const aiArtStrengths = resolvedValue23;
    let resolvedValue24: any;
  if (Array.isArray(artMetadata?.aiArtLayer?.risks)) {
    resolvedValue24 = artMetadata.aiArtLayer.risks;
  } else {
    resolvedValue24 = [];
  }
const aiArtRisks = resolvedValue24;

  let resolvedValue31: any;
  if (feedback) {
    resolvedValue31 = <p className="text-sm text-muted-foreground">{feedback}</p>;
  } else {
    resolvedValue31 = null;
  }
  let resolvedValue32: any;
  if (aiLayer) {
    resolvedValue32 = (
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
                          {aiCreativeAngles.map((item: any) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Canais de aquisição</p>
                        <ul className="mt-2 space-y-2 text-muted-foreground">
                          {aiAcquisitionChannels.map((item: any) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Gatilhos de wishlist</p>
                        <ul className="mt-2 space-y-2 text-muted-foreground">
                          {aiWishlistDrivers.map((item: any) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Alertas da IA</p>
                        <ul className="mt-2 space-y-2 text-muted-foreground">
                          {aiRedFlags.map((item: any) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                );
  } else {
    resolvedValue32 = null;
  }
  let resolvedValue33: any;
  if (hybridMarketIntelligence) {
        let resolvedValue53: any;
    if (hybridSuccessfulLaunches.length) {
      resolvedValue53 = hybridSuccessfulLaunches.slice(0, 5).map((game: any) => (
                              <li key={game.appId}>{game.name} · {formatNumber(game.reviewScore)}% · {formatNumber(game.reviewCount)} reviews</li>
                            ));
    } else {
      resolvedValue53 = <li>Nenhum lançamento recente de alta confiança neste conjunto comparável.</li>;
    }
    let resolvedValue54: any;
    if (hybridFailedLaunches.length) {
      resolvedValue54 = hybridFailedLaunches.slice(0, 5).map((game: any) => (
                              <li key={game.appId}>{game.name} · {formatNumber(game.reviewScore)}% · {formatNumber(game.reviewCount)} reviews</li>
                            ));
    } else {
      resolvedValue54 = <li>Nenhum lançamento recente claramente fraco neste conjunto comparável.</li>;
    }
    let resolvedValue55: any;
    if (hybridLimitations.length) {
      resolvedValue55 = (
                        <ul className="mt-3 space-y-2 text-muted-foreground">
                          {hybridLimitations.map((item: any) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      );
    } else {
      resolvedValue55 = null;
    }
resolvedValue33 = (
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
                      {Object.entries(hybridProbabilities).map(([key, value]) => {
                        let resolvedValue52: any;
                        if (typeof value === "number" || typeof value === "string") {
                          resolvedValue52 = value;
                        } else {
                          resolvedValue52 = "N/A";
                        }
                        return (
                        <div key={key} className="rounded-xl border bg-muted/30 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</p>
                          <p className="mt-1 text-lg font-semibold">{resolvedValue52}</p>
                        </div>
                      );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Fatores ponderados do score</p>
                      <div className="mt-3 space-y-3">
                        {hybridFactors.map((factor: any) => (
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
                        {hybridEmergingTags.slice(0, 4).map((trend: any) => (
                          <div key={trend.tag} className="rounded-xl border bg-muted/30 p-3">
                            <p className="font-medium">{trend.tag} · {trend.strengthScore}</p>
                            <p className="mt-1 text-muted-foreground">{trend.explanation}</p>
                          </div>
                        ))}
                        {hybridDecliningSignals.slice(0, 3).map((trend: any) => (
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
                        {hybridMarketLeaders.slice(0, 5).map((game: any) => (
                          <li key={game.appId}>{game.name} · {formatCurrency(game.medianRevenueCents)} · {formatNumber(game.reviewScore)}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Lançamentos recentes bem-sucedidos</p>
                      <ul className="mt-3 space-y-2 text-muted-foreground">
                        {resolvedValue53}
                      </ul>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Lançamentos similares fracos ou malsucedidos</p>
                      <ul className="mt-3 space-y-2 text-muted-foreground">
                        {resolvedValue54}
                      </ul>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border p-4">
                      <p className="font-medium">Trilha de evidências</p>
                      <div className="mt-3 space-y-3">
                        {hybridEvidenceTrail.map((item: any) => (
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
                      {resolvedValue55}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
  } else {
    resolvedValue33 = null;
  }
  let resolvedValue34: any;
  if (marketDepth) {
    resolvedValue34 = `${marketDepth.marketSizeLabel} · ${formatCurrency(marketDepth.marketSizeCents)}`;
  } else {
    resolvedValue34 = "Análise pendente.";
  }
  let resolvedValue35: any;
  if (marketDepth) {
    resolvedValue35 = `${formatNumber(marketDepth.reviewVelocity90)} vs ${formatNumber(marketDepth.previousReviewVelocity90)} nos 90 dias anteriores`;
  } else {
    resolvedValue35 = "Análise pendente.";
  }
  let resolvedValue36: any;
  if (marketDepth) {
    resolvedValue36 = `${formatNumber(marketDepth.playerMomentum30)} média vs ${formatNumber(marketDepth.previousPlayerMomentum30)}`;
  } else {
    resolvedValue36 = "Análise pendente.";
  }
  let resolvedValue37: any;
  if (marketDepth) {
    resolvedValue37 = `${marketDepth.launchCohorts?.last90Days ?? 0} / 90d · ${marketDepth.launchCohorts?.last180Days ?? 0} / 180d · ${marketDepth.launchCohorts?.last365Days ?? 0} / 365d`;
  } else {
    resolvedValue37 = "Análise pendente.";
  }
  let resolvedValue38: any;
  if (marketDepth) {
    resolvedValue38 = `<$10: ${marketDepth.priceBandDistribution?.under10 ?? 0} · $10-20: ${marketDepth.priceBandDistribution?.between10And20 ?? 0} · $20-30: ${marketDepth.priceBandDistribution?.between20And30 ?? 0} · $30+: ${marketDepth.priceBandDistribution?.over30 ?? 0}`;
  } else {
    resolvedValue38 = "Análise pendente.";
  }
  let resolvedValue39: any;
  if (competitionLayer) {
    resolvedValue39 = `${competitionLayer.directComparableCount} diretos · ${competitionLayer.adjacentComparableCount} adjacentes`;
  } else {
    resolvedValue39 = "Análise pendente.";
  }
  let resolvedValue40: any;
  if (competitionLayer) {
    resolvedValue40 = `${competitionLayer.winnerConcentrationScore}% nos vencedores principais`;
  } else {
    resolvedValue40 = "Análise pendente.";
  }
  let resolvedValue41: any;
  if (competitionLayer) {
    resolvedValue41 = `${competitionLayer.dominantMonetization} dominante · ${competitionLayer.premiumSharePercent}% premium`;
  } else {
    resolvedValue41 = "Análise pendente.";
  }
  let resolvedValue42: any;
  if (marketDepth) {
    resolvedValue42 = `${marketDepth.confidenceLabel} (${marketDepth.confidenceScore})`;
  } else {
    resolvedValue42 = "Análise pendente.";
  }
  let resolvedValue43: any;
  if (opportunityRecommendations.length) {
    resolvedValue43 = opportunityRecommendations.map((item: any) => (
                        <li key={item}>- {item}</li>
                      ));
  } else {
    resolvedValue43 = <li>Análise pendente.</li>;
  }
  let resolvedValue44: any;
  if (opportunityMismatches.length) {
    resolvedValue44 = opportunityMismatches.map((item: any) => (
                        <li key={item}>- {item}</li>
                      ));
  } else {
    resolvedValue44 = <li>{t("projectDetail.noMismatches")}</li>;
  }
  let resolvedValue45: any;
  if (project.competitorGames.length > 0) {
    resolvedValue45 = project.competitorGames.map((item: any) => (
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
              ));
  } else {
    resolvedValue45 = (
                <p className="text-sm text-muted-foreground">{t("projectDetail.noComparableSet")}</p>
              );
  }
  let resolvedValue46: any;
  if (!canRunArtAnalysis) {
    resolvedValue46 = (
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
          );
  } else {
        let resolvedValue56: any;
    if (project.artAssets.length > 0) {
      resolvedValue56 = (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {project.artAssets.map((asset: any) => {
                        let resolvedValue66: any;
                        if (asset.signedUrl) {
                          resolvedValue66 = (
                            <img src={asset.signedUrl} alt={asset.originalName} className="h-52 w-full object-cover" />
                          );
                        } else {
                          resolvedValue66 = (
                            <div className="flex h-52 items-center justify-center bg-muted text-sm text-muted-foreground">Prévia indisponível</div>
                          );
                        }
                        let resolvedValue67: any;
                        if (asset.width && asset.height) {
                          resolvedValue67 = `${asset.width} x ${asset.height}`;
                        } else {
                          resolvedValue67 = "Dimensões indisponíveis";
                        }
                        let resolvedValue68: any;
                        if (asset.visualMetrics) {
                          resolvedValue68 = (
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
                            );
                        } else {
                          resolvedValue68 = (
                              <p className="text-xs text-muted-foreground">Métricas de pixel indisponíveis para este arquivo. Reenvie para analisar a legibilidade visual.</p>
                            );
                        }
                        let resolvedValue69: any;
                        if (asset.notes) {
                          resolvedValue69 = <p className="text-xs text-muted-foreground">{asset.notes}</p>;
                        } else {
                          resolvedValue69 = null;
                        }
                        return (
                        <div key={asset.id} className="overflow-hidden rounded-2xl border bg-muted/20">
                          {resolvedValue66}
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
                              {resolvedValue67} · {(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB
                            </p>
                            {resolvedValue68}
                            {resolvedValue69}
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  );
    } else {
      resolvedValue56 = (
                    <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
                      Envie cápsulas, headers, screenshots, personagens, ambientes ou referências antes de rodar a análise de arte. Sem uploads, o sistema só consegue estimar a partir do texto do projeto e dos comparáveis de mercado.
                    </div>
                  );
    }
    let resolvedValue57: any;
    if (uploadedDominantColors.length) {
      resolvedValue57 = (
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
                        {uploadedDominantColors.map((color: any) => (
                          <span key={color} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                            <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: color }} />
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
    } else {
      resolvedValue57 = null;
    }
    let resolvedValue58: any;
    if (isAnalyzingArt) {
      resolvedValue58 = t("projectDetail.analyzingArt");
    } else {
            let resolvedValue70: any;
      if (project.artAnalysis) {
        resolvedValue70 = t("projectDetail.refreshArtAnalysis");
      } else {
        resolvedValue70 = t("projectDetail.runArtAnalysis");
      }
resolvedValue58 = resolvedValue70;
    }
    let resolvedValue59: any;
    if (isProArtAnalysis) {
      resolvedValue59 = (
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
                          {proProductionLevers.map((item: any) => (
                            <p key={item}>• {item}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
    } else {
      resolvedValue59 = null;
    }
    let resolvedValue60: any;
    if (artMetadata?.aiArtLayer) {
      resolvedValue60 = (
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
                          {aiArtPriorityFixes.map((item: any) => (
                            <p key={item}>- {item}</p>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Pontos fortes</p>
                        <div className="mt-2 space-y-2 text-muted-foreground">
                          {aiArtStrengths.map((item: any) => (
                            <p key={item}>- {item}</p>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Riscos</p>
                        <div className="mt-2 space-y-2 text-muted-foreground">
                          {aiArtRisks.map((item: any) => (
                            <p key={item}>- {item}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
    } else {
            let resolvedValue71: any;
      if (project.artAssets.length > 0) {
        resolvedValue71 = (
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
              );
      } else {
        resolvedValue71 = null;
      }
resolvedValue60 = resolvedValue71;
    }
    let resolvedValue61: any;
    if (isProArtAnalysis) {
            let resolvedValue72: any;
      if (proReferenceShelf.length) {
        resolvedValue72 = proReferenceShelf.map((item: any) => (
                      <div key={item.name} className="rounded-2xl border p-4">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Barra de reviews {formatPercent(item.reviewScore, 1)} · Preço {formatCurrency(item.priceCents)}
                          </p>
                        </div>
                      </div>
                    ));
      } else {
        resolvedValue72 = (
                      <p className="text-sm text-muted-foreground">{t("projectDetail.proBenchmarkFallback")}</p>
                    );
      }
resolvedValue61 = (
                <Card>
                  <CardHeader>
                    <CardTitle>Benchmark Pro de prateleira</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {resolvedValue72}
                  </CardContent>
                </Card>
              );
    } else {
      resolvedValue61 = null;
    }
    let resolvedValue62: any;
    if (project.competitorGames.length > 0) {
      resolvedValue62 = project.competitorGames.slice(0, 6).map((item: any) => (
                    <div key={item.steamGame.id} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-medium">{item.steamGame.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {(item.steamGame.genres.map((genre: any) => genre.steamGenre?.name).filter(Boolean).slice(0, 2).join(", ")) || t("projectDetail.noGenreCoverage")}
                            {" · "}
                            {(item.steamGame.tags.map((tag: any) => tag.steamTag?.name).filter(Boolean).slice(0, 3).join(", ")) || t("projectDetail.noTagCoverage")}
                          </p>
                        </div>
                        <p className="text-sm font-medium">
                          Barra de reviews: {formatPercent(item.steamGame.reviewScore ?? null, 1)}
                        </p>
                      </div>
                    </div>
                  ));
    } else {
      resolvedValue62 = (
                    <p className="text-sm text-muted-foreground">Rode a análise de mercado primeiro para montar o conjunto inicial de referências.</p>
                  );
    }
resolvedValue46 = (
            <>
              <Card className="overflow-hidden border-cyan-300/15 bg-gradient-to-br from-background via-background to-cyan-950/15">
                <CardHeader>
                  <CardTitle>Assets de arte enviados</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-3 rounded-2xl border border-dashed border-cyan-300/25 bg-cyan-400/[0.04] p-4 lg:grid-cols-[180px_minmax(0,1fr)_220px]">
                    <div className="space-y-2">
                      <Label>Tipo de asset</Label>
                      <Select value={artAssetForm.kind} onValueChange={(value: any) => setArtAssetForm((current: any) => ({ ...current, kind: value }))}>
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
                        onChange={(event: any) => setArtAssetForm((current: any) => ({ ...current, notes: event.target.value }))}
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
                        onChange={(event: any) => uploadArtAsset(event.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>
                  {resolvedValue56}
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
                    <p className="mt-2 text-2xl font-semibold">{uploadedArtAssets?.pixelAnalyzed ?? project.artAssets.filter((asset: any) => asset.visualMetrics).length}</p>
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
              {resolvedValue57}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Análise integrada de direção de arte</CardTitle>
                  <Button disabled={isAnalyzingArt} onClick={runArtAnalysis}>
                    {resolvedValue58}
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
                  {resolvedValue59}
                </CardContent>
              </Card>
              {resolvedValue60}
              {resolvedValue61}
              <Card>
                <CardHeader>
                  <CardTitle>Conjunto de referências de arte</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {resolvedValue62}
                </CardContent>
              </Card>
            </>
          );
  }
  function togglePlannerProperty(property: ProductionPlannerPropertyKey) {
    setPlannerVisibleProperties((current) => ({
      ...current,
      [property]: !current[property]
    }));
  }

  function renderProductionPlannerItem(item: ProductionPlannerItem) {
    const metaParts: string[] = [];

    if (plannerVisibleProperties.status) {
      metaParts.push(item.status);
    }

    if (plannerVisibleProperties.source) {
      metaParts.push(item.sourceLabel);
    }

    let dateBadge = null;

    if (plannerVisibleProperties.date) {
      dateBadge = (
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
          {item.dueAt.toLocaleDateString()}
        </span>
      );
    }

    let ownerLine = null;

    if (plannerVisibleProperties.owner && item.ownerLabel) {
      ownerLine = <p className="mt-2 text-xs text-muted-foreground">Owner: {item.ownerLabel}</p>;
    }

    let descriptionLine = null;

    if (plannerVisibleProperties.description && item.description) {
      descriptionLine = <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>;
    }

    return (
      <div key={item.id} className="rounded-2xl border border-white/10 bg-background/75 p-3 text-sm shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium">{item.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {[item.type.toUpperCase(), ...metaParts].join(" · ")}
            </p>
          </div>
          {dateBadge}
        </div>
        {ownerLine}
        {descriptionLine}
      </div>
    );
  }

  let resolvedValue47: any;
  if (executionView === "board") {
    resolvedValue47 = "default";
  } else {
    resolvedValue47 = "ghost";
  }
  let resolvedValue48: any;
  if (executionView === "milestones") {
    resolvedValue48 = "default";
  } else {
    resolvedValue48 = "ghost";
  }
  let resolvedValue49: any;
  if (executionView === "board") {
    resolvedValue49 = (
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
              createView={createView}
              updateView={updateView}
              deleteView={deleteView}
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
          );
  } else {
        let resolvedValue63: any;
    if (project.milestones.length === 0) {
      resolvedValue63 = (
                    <p className="text-sm text-muted-foreground">{t("projectDetail.noMilestones")}</p>
                  );
    } else {
      resolvedValue63 = (
                    project.milestones.map((milestone) => {
                      let resolvedValue76: any;
                      if (milestone.dueAt) {
                        resolvedValue76 = new Date(milestone.dueAt).toISOString().slice(0, 10);
                      } else {
                        resolvedValue76 = "";
                      }
                      return (
                      <div key={milestone.id} className="rounded-[1.5rem] border border-white/10 bg-white/45 p-4 backdrop-blur dark:bg-white/[0.03]">
                        <div className="grid gap-3 md:grid-cols-2">
                          <Input
                            value={milestoneEdits[milestone.id]?.title ?? milestone.title}
                            onChange={(event: any) => setMilestoneEdits((current: any) => {
                              let resolvedValue73: any;
                              if (milestone.dueAt) {
                                resolvedValue73 = new Date(milestone.dueAt).toISOString().slice(0, 10);
                              } else {
                                resolvedValue73 = "";
                              }
                              return ({
                              ...current,
                              [milestone.id]: {
                                title: event.target.value,
                                description: current[milestone.id]?.description ?? milestone.description ?? "",
                                ownerLabel: current[milestone.id]?.ownerLabel ?? milestone.ownerLabel ?? "",
                                status: current[milestone.id]?.status ?? milestone.status,
                                dueAt: current[milestone.id]?.dueAt ?? (resolvedValue73),
                                budgetedCostCents: current[milestone.id]?.budgetedCostCents ?? String(milestone.budgetedCostCents ?? 0),
                                expectedRevenueCents: current[milestone.id]?.expectedRevenueCents ?? String(milestone.expectedRevenueCents ?? 0)
                              }
                            });
                            })}
                          />
                          <ProjectAssigneeSelect
                            value={milestoneEdits[milestone.id]?.ownerLabel ?? milestone.ownerLabel ?? ""}
                            onChange={(ownerLabel) => setMilestoneEdits((current: any) => {
                              let resolvedValue74: any;
                              if (milestone.dueAt) {
                                resolvedValue74 = new Date(milestone.dueAt).toISOString().slice(0, 10);
                              } else {
                                resolvedValue74 = "";
                              }
                              return ({
                              ...current,
                              [milestone.id]: {
                                title: current[milestone.id]?.title ?? milestone.title,
                                description: current[milestone.id]?.description ?? milestone.description ?? "",
                                ownerLabel,
                                status: current[milestone.id]?.status ?? milestone.status,
                                dueAt: current[milestone.id]?.dueAt ?? (resolvedValue74),
                                budgetedCostCents: current[milestone.id]?.budgetedCostCents ?? String(milestone.budgetedCostCents ?? 0),
                                expectedRevenueCents: current[milestone.id]?.expectedRevenueCents ?? String(milestone.expectedRevenueCents ?? 0)
                              }
                            });
                            })}
                            assigneeOptions={assigneeOptions}
                          />
                          <Select
                            value={milestoneEdits[milestone.id]?.status ?? milestone.status}
                            onValueChange={(value: any) => setMilestoneEdits((current: any) => {
                              let resolvedValue75: any;
                              if (milestone.dueAt) {
                                resolvedValue75 = new Date(milestone.dueAt).toISOString().slice(0, 10);
                              } else {
                                resolvedValue75 = "";
                              }
                              return ({
                              ...current,
                              [milestone.id]: {
                                title: current[milestone.id]?.title ?? milestone.title,
                                description: current[milestone.id]?.description ?? milestone.description ?? "",
                                ownerLabel: current[milestone.id]?.ownerLabel ?? milestone.ownerLabel ?? "",
                                status: value,
                                dueAt: current[milestone.id]?.dueAt ?? (resolvedValue75),
                                budgetedCostCents: current[milestone.id]?.budgetedCostCents ?? String(milestone.budgetedCostCents ?? 0),
                                expectedRevenueCents: current[milestone.id]?.expectedRevenueCents ?? String(milestone.expectedRevenueCents ?? 0)
                              }
                            });
                            })}
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
                            value={milestoneEdits[milestone.id]?.dueAt ?? (resolvedValue76)}
                            onChange={(event: any) => setMilestoneEdits((current: any) => ({
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
                            onChange={(event: any) => setMilestoneEdits((current: any) => {
                              let resolvedValue77: any;
                              if (milestone.dueAt) {
                                resolvedValue77 = new Date(milestone.dueAt).toISOString().slice(0, 10);
                              } else {
                                resolvedValue77 = "";
                              }
                              return ({
                              ...current,
                              [milestone.id]: {
                                title: current[milestone.id]?.title ?? milestone.title,
                                description: current[milestone.id]?.description ?? milestone.description ?? "",
                                ownerLabel: current[milestone.id]?.ownerLabel ?? milestone.ownerLabel ?? "",
                                status: current[milestone.id]?.status ?? milestone.status,
                                dueAt: current[milestone.id]?.dueAt ?? (resolvedValue77),
                                budgetedCostCents: event.target.value,
                                expectedRevenueCents: current[milestone.id]?.expectedRevenueCents ?? String(milestone.expectedRevenueCents ?? 0)
                              }
                            });
                            })}
                          />
                          <Input
                            type="number"
                            value={milestoneEdits[milestone.id]?.expectedRevenueCents ?? String(milestone.expectedRevenueCents ?? 0)}
                            onChange={(event: any) => setMilestoneEdits((current: any) => {
                              let resolvedValue78: any;
                              if (milestone.dueAt) {
                                resolvedValue78 = new Date(milestone.dueAt).toISOString().slice(0, 10);
                              } else {
                                resolvedValue78 = "";
                              }
                              return ({
                              ...current,
                              [milestone.id]: {
                                title: current[milestone.id]?.title ?? milestone.title,
                                description: current[milestone.id]?.description ?? milestone.description ?? "",
                                ownerLabel: current[milestone.id]?.ownerLabel ?? milestone.ownerLabel ?? "",
                                status: current[milestone.id]?.status ?? milestone.status,
                                dueAt: current[milestone.id]?.dueAt ?? (resolvedValue78),
                                budgetedCostCents: current[milestone.id]?.budgetedCostCents ?? String(milestone.budgetedCostCents ?? 0),
                                expectedRevenueCents: event.target.value
                              }
                            });
                            })}
                          />
                          <Textarea
                            className="md:col-span-2"
                            value={milestoneEdits[milestone.id]?.description ?? milestone.description ?? ""}
                            onChange={(event: any) => setMilestoneEdits((current: any) => {
                              let resolvedValue79: any;
                              if (milestone.dueAt) {
                                resolvedValue79 = new Date(milestone.dueAt).toISOString().slice(0, 10);
                              } else {
                                resolvedValue79 = "";
                              }
                              return ({
                              ...current,
                              [milestone.id]: {
                                title: current[milestone.id]?.title ?? milestone.title,
                                description: event.target.value,
                                ownerLabel: current[milestone.id]?.ownerLabel ?? milestone.ownerLabel ?? "",
                                status: current[milestone.id]?.status ?? milestone.status,
                                dueAt: current[milestone.id]?.dueAt ?? (resolvedValue79),
                                budgetedCostCents: current[milestone.id]?.budgetedCostCents ?? String(milestone.budgetedCostCents ?? 0),
                                expectedRevenueCents: current[milestone.id]?.expectedRevenueCents ?? String(milestone.expectedRevenueCents ?? 0)
                              }
                            });
                            })}
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm text-muted-foreground">
                            Orçamento {formatCurrency(milestone.budgetedCostCents)} · Receita {formatCurrency(milestone.expectedRevenueCents)}
                          </div>
                          <Button type="button" onClick={() => saveMilestone(milestone.id)}>{t("projectDetail.saveMilestone")}</Button>
                        </div>
                      </div>
                    );
                    })
                  );
    }
    let resolvedValue64: any;
    if (project.budgets.length > 0) {
      resolvedValue64 = (
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
                  );
    } else {
      resolvedValue64 = null;
    }
resolvedValue49 = (
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
                  <Input value={newMilestone.title} onChange={(event: any) => setNewMilestone((current: any) => ({ ...current, title: event.target.value }))} placeholder="Vertical slice" />
                  <ProjectAssigneeSelect
                    value={newMilestone.ownerLabel}
                    onChange={(ownerLabel) => setNewMilestone((current: any) => ({ ...current, ownerLabel }))}
                    assigneeOptions={assigneeOptions}
                  />
                  <Select value={newMilestone.status} onValueChange={(value: any) => setNewMilestone((current: any) => ({ ...current, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["PLANNED", "IN_PROGRESS", "BLOCKED", "COMPLETED"].map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={newMilestone.dueAt} onChange={(event: any) => setNewMilestone((current: any) => ({ ...current, dueAt: event.target.value }))} />
                  <Input type="number" value={newMilestone.budgetedCostCents} onChange={(event: any) => setNewMilestone((current: any) => ({ ...current, budgetedCostCents: event.target.value }))} placeholder="Custo orçado em centavos" />
                  <Input type="number" value={newMilestone.expectedRevenueCents} onChange={(event: any) => setNewMilestone((current: any) => ({ ...current, expectedRevenueCents: event.target.value }))} placeholder="Receita esperada em centavos" />
                  <Textarea className="md:col-span-2" value={newMilestone.description} onChange={(event: any) => setNewMilestone((current: any) => ({ ...current, description: event.target.value }))} placeholder="Escopo do marco, critérios de aceite, notas de entrega..." />
                  <Button className="md:col-span-2" onClick={createMilestone}>Criar marco</Button>
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
                <CardHeader>
                  <CardTitle>Marcos do projeto e ponte financeira</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {resolvedValue63}
                  {resolvedValue64}
                </CardContent>
              </Card>
            </>
          );
  }
  let resolvedValue50: any;
  if (isGeneratingGdd) {
    resolvedValue50 = "Gerando...";
  } else {
        let resolvedValue65: any;
    if (latestGdd) {
      resolvedValue65 = "Gerar novamente";
    } else {
      resolvedValue65 = "Gerar GDD";
    }
resolvedValue50 = resolvedValue65;
  }
  let resolvedValue51: any;
  if (latestGdd) {
    resolvedValue51 = (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {latestGdd.title} · Atualizado em {new Date(latestGdd.updatedAt).toLocaleString()}
                  </p>
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border bg-muted/30 p-4 text-sm">
                    {latestGdd.content}
                  </pre>
                </div>
              );
  } else {
    resolvedValue51 = (
                <p className="text-sm text-muted-foreground">Gere o primeiro GDD a partir do projeto atual e da análise de mercado.</p>
              );
  }
  let plannerCalendarVariant: "default" | "outline" = "outline";
  let plannerTimelineVariant: "default" | "outline" = "outline";
  let plannerBoardVariant: "default" | "outline" = "outline";

  if (plannerView === "calendar") {
    plannerCalendarVariant = "default";
  }

  if (plannerView === "timeline") {
    plannerTimelineVariant = "default";
  }

  if (plannerView === "board") {
    plannerBoardVariant = "default";
  }

  let plannerEmptyState = null;

  if (productionPlanner.items.length === 0) {
    plannerEmptyState = (
      <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
        Nenhum item com data neste período. Adicione uma data em milestones ou cards do kanban. Para reuniões, use labels como meeting ou reunião.
      </div>
    );
  }

  let plannerCalendarView = null;

  if (plannerView === "calendar") {
    plannerCalendarView = (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {productionPlanner.buckets.map((bucket) => (
          <div key={bucket.key} className="min-h-32 rounded-2xl border border-white/10 bg-white/45 p-3 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{bucket.label}</p>
              <span className="text-xs text-muted-foreground">{formatNumber(bucket.items.length)}</span>
            </div>
            <div className="mt-3 space-y-2">
              {bucket.items.map(renderProductionPlannerItem)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  let plannerTimelineView = null;

  if (plannerView === "timeline") {
    plannerTimelineView = (
      <div className="space-y-3">
        {productionPlanner.items.map((item) => (
          <div key={item.id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/45 p-3 dark:bg-white/[0.03] md:grid-cols-[140px_minmax(0,1fr)]">
            <div>
              <p className="text-sm font-semibold">{item.dueAt.toLocaleDateString()}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.type}</p>
            </div>
            {renderProductionPlannerItem(item)}
          </div>
        ))}
      </div>
    );
  }

  let plannerBoardView = null;

  if (plannerView === "board") {
    plannerBoardView = (
      <div className="grid gap-3 xl:grid-cols-4">
        {productionPlanner.boardGroups.map((group) => (
          <div key={group.key} className="rounded-2xl border border-white/10 bg-white/45 p-3 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{group.label}</p>
              <span className="text-xs text-muted-foreground">{formatNumber(group.items.length)}</span>
            </div>
            <div className="mt-3 space-y-2">
              {group.items.map(renderProductionPlannerItem)}
            </div>
          </div>
        ))}
      </div>
    );
  }
return (
    <div className="space-y-6">
      {resolvedValue31}
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
                {resolvedValue32}
              </CardContent>
            </Card>
            {resolvedValue33}
            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Profundidade de mercado</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Tamanho de mercado</p>
                    <p className="mt-2 text-foreground">
                      {resolvedValue34}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Velocidade de reviews</p>
                    <p className="mt-2 text-foreground">
                      {resolvedValue35}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Momento de jogadores</p>
                    <p className="mt-2 text-foreground">
                      {resolvedValue36}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="font-medium">Coortes de lançamento</p>
                    <p className="mt-2 text-foreground">
                      {resolvedValue37}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4 md:col-span-2">
                    <p className="font-medium">Distribuição de preço</p>
                    <p className="mt-2 text-foreground">
                      {resolvedValue38}
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
                      {resolvedValue39}
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
                      {resolvedValue40}
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
                      {resolvedValue41}
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
                      {resolvedValue42}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4 md:col-span-2">
                    <p className="font-medium">Recomendações práticas</p>
                    <ul className="mt-2 space-y-2 text-muted-foreground">
                      {resolvedValue43}
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
                      {resolvedValue44}
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
              {resolvedValue45}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="art" className="space-y-6">
          {resolvedValue46}
        </TabsContent>
        <TabsContent value="milestones" className="space-y-4">
          <Card className="overflow-hidden">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle>Production planner</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Visualize o que precisa acontecer na semana, mês ou ano usando milestones e cards do kanban com data.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant={plannerCalendarVariant} onClick={() => setPlannerView("calendar")}>
                    Calendar
                  </Button>
                  <Button type="button" size="sm" variant={plannerTimelineVariant} onClick={() => setPlannerView("timeline")}>
                    Timeline
                  </Button>
                  <Button type="button" size="sm" variant={plannerBoardVariant} onClick={() => setPlannerView("board")}>
                    Board
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[180px_180px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <Label>Reference date</Label>
                  <Input type="date" value={plannerReferenceDate} onChange={(event) => setPlannerReferenceDate(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Range</Label>
                  <Select value={plannerRange} onValueChange={(value: ProductionPlannerRange) => setPlannerRange(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/45 p-3 text-sm dark:bg-white/[0.03] sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Total</p>
                    <p className="mt-1 font-semibold">{formatNumber(productionPlanner.items.length)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Meetings</p>
                    <p className="mt-1 font-semibold">{formatNumber(productionPlanner.meetings)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Milestones</p>
                    <p className="mt-1 font-semibold">{formatNumber(productionPlanner.milestones)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Deadlines</p>
                    <p className="mt-1 font-semibold">{formatNumber(productionPlanner.deadlines)}</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/45 p-3 dark:bg-white/[0.03] lg:grid-cols-[minmax(180px,1fr)_160px_160px_160px_160px]">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <Input value={plannerSearch} onChange={(event) => setPlannerSearch(event.target.value)} placeholder="Search title, owner, status..." />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={plannerTypeFilter} onValueChange={(value: ProductionPlannerTypeFilter) => setPlannerTypeFilter(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="meeting">Meetings</SelectItem>
                      <SelectItem value="milestone">Milestones</SelectItem>
                      <SelectItem value="deadline">Deadlines</SelectItem>
                      <SelectItem value="task">Tasks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Group by</Label>
                  <Select value={plannerGroupBy} onValueChange={(value: ProductionPlannerGroupBy) => setPlannerGroupBy(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="type">Type</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="source">Source</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sort</Label>
                  <Select value={plannerSortBy} onValueChange={(value: ProductionPlannerSortBy) => setPlannerSortBy(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Direction</Label>
                  <Select value={plannerSortDirection} onValueChange={(value: ProductionPlannerSortDirection) => setPlannerSortDirection(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2 lg:col-span-5">
                  {(["date", "owner", "status", "source", "description"] as ProductionPlannerPropertyKey[]).map((property) => (
                    <Button
                      key={property}
                      type="button"
                      size="sm"
                      variant="outline"
                      className={cn(plannerVisibleProperties[property] && "border-cyan-300/40 bg-cyan-300/10")}
                      onClick={() => togglePlannerProperty(property)}
                    >
                      {property}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {plannerEmptyState}
              {plannerCalendarView}
              {plannerTimelineView}
              {plannerBoardView}
            </CardContent>
          </Card>
          <div className="flex items-center gap-1 rounded-lg border bg-muted/25 p-1">
            <Button
              type="button"
              size="sm"
              variant={resolvedValue47}
              onClick={() => setExecutionView("board")}
            >
              {t("projectDetail.executionBoardView")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={resolvedValue48}
              onClick={() => setExecutionView("milestones")}
            >
              {t("projectDetail.executionMilestonesView")}
            </Button>
          </div>
          {resolvedValue49}
        </TabsContent>
        <TabsContent value="gdd" className="space-y-6">
          <Card className="overflow-hidden">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>GDD automatizado</CardTitle>
              <Button disabled={isGeneratingGdd} onClick={generateGdd}>
                {resolvedValue50}
              </Button>
            </CardHeader>
            <CardContent>
              {resolvedValue51}
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

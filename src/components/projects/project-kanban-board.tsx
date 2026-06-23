"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  User2
} from "lucide-react";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectDetailResponse } from "@/features/projects/hooks";
import { ProjectAssigneeSelect } from "@/features/projects/components/project-assignee-select";
import type { ProjectAssigneeOption } from "@/features/projects/types";
import { getKanbanCardLabels } from "@/features/projects/utils/kanban";
import { cn, formatNumber } from "@/lib/utils";

type KanbanBoard = ProjectDetailResponse["kanbanBoards"][number];
type KanbanColumn = KanbanBoard["columns"][number];
type KanbanCard = KanbanColumn["cards"][number];

type CardDraft = {
  title: string;
  description: string;
  assigneeLabel: string;
  dueDate: string;
  labels: string;
};

type CardEdit = CardDraft & {
  columnId: string;
};

type DrawerState =
  | { mode: "create"; columnId: string }
  | { mode: "edit"; cardId: string }
  | null;

type KanbanSortMode = "manual" | "dueDate" | "title" | "assignee";
type KanbanViewLayout = "table" | "board" | "list";
type KanbanGroupBy = "status" | "priority" | "area" | "type" | "assignee" | "dueDate" | "label";
type KanbanDensity = "comfortable" | "compact";
type KanbanCardPropertyKey = "description" | "labels" | "dueDate" | "assignee" | "status" | "priority" | "area" | "type";
type KanbanCardPropertyVisibility = Record<KanbanCardPropertyKey, boolean>;
type KanbanViewDraft = {
  name: string;
  layout: string;
  groupBy: string;
  sortBy: string;
  sortDirection: string;
  visibleProperties: string[];
};
type KanbanView = KanbanBoard["views"][number] | {
  id: string;
  name: string;
  layout: string;
  groupBy: string;
  sortBy: string;
  sortDirection: string;
  visibleProperties: unknown;
  filters: unknown;
};
type KanbanCardRow = {
  card: KanbanCard;
  columnId: string;
  columnIndex: number;
  status: string;
  priority: string;
  area: string;
  type: string;
  firstLabel: string;
};

function normalizeKanbanCards(cards: KanbanCard[]) {
  return cards.map((card, index) => ({
    ...card,
    sortOrder: index
  }));
}

function moveCardInBoard(board: KanbanBoard, cardId: string, targetColumnId: string, targetIndex: number) {
  let movingCard: KanbanCard | null = null;

  const columnsWithoutCard = board.columns.map((column) => {
    const cards: KanbanCard[] = [];

    for (const card of column.cards) {
      if (card.id === cardId) {
        movingCard = card;
        continue;
      }

      cards.push(card);
    }

    return {
      ...column,
      cards: normalizeKanbanCards(cards)
    };
  });

  if (!movingCard) {
    return board;
  }

  const cardToMove = movingCard;
  let foundTargetColumn = false;
  const columns = columnsWithoutCard.map((column) => {
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

    cards.splice(nextIndex, 0, cardToMove);

    return {
      ...column,
      cards: normalizeKanbanCards(cards)
    };
  });

  if (!foundTargetColumn) {
    return board;
  }

  return {
    ...board,
    columns
  };
}

function moveCardOneSlotInBoard(board: KanbanBoard, cardId: string, direction: "up" | "down") {
  for (const column of board.columns) {
    const currentIndex = column.cards.findIndex((card) => card.id === cardId);

    if (currentIndex < 0) {
      continue;
    }

    let targetIndex = currentIndex + 1;

    if (direction === "up") {
      targetIndex = currentIndex - 1;
    }

    return moveCardInBoard(board, cardId, column.id, targetIndex);
  }

  return board;
}

function getBoardSignature(board: KanbanBoard | null) {
  if (!board) {
    return "";
  }

  const columnSignature = board.columns.map((column) => {
    const cardIds = column.cards.map((card) => card.id).join(",");

    return `${column.id}:${cardIds}`;
  }).join("|");
  const viewSignature = (board.views ?? []).map((view) => `${view.id}:${view.name}:${view.layout}:${view.groupBy}:${view.sortBy}:${view.sortDirection}`).join("|");

  return `${columnSignature}::${viewSignature}`;
}

function compareKanbanCards(left: KanbanCard, right: KanbanCard, sortMode: KanbanSortMode) {
  if (sortMode === "title") {
    return left.title.localeCompare(right.title);
  }

  if (sortMode === "assignee") {
    return (left.assigneeLabel ?? "").localeCompare(right.assigneeLabel ?? "");
  }

  if (sortMode === "dueDate") {
    let leftTime = Number.MAX_SAFE_INTEGER;
    let rightTime = Number.MAX_SAFE_INTEGER;

    if (left.dueDate) {
      leftTime = new Date(left.dueDate).getTime();
    }

    if (right.dueDate) {
      rightTime = new Date(right.dueDate).getTime();
    }

    return leftTime - rightTime;
  }

  return left.sortOrder - right.sortOrder;
}

function getDefaultKanbanProperties() {
  return ["status", "priority", "area", "type", "assignee", "dueDate", "labels", "description"];
}

function getKanbanViewProperties(value: unknown) {
  if (!Array.isArray(value)) {
    return getDefaultKanbanProperties();
  }

  return value.filter((item): item is string => typeof item === "string");
}

function getDefaultKanbanViews(): KanbanView[] {
  return [
    {
      id: "default-table",
      name: "All Tasks",
      layout: "table",
      groupBy: "status",
      sortBy: "manual",
      sortDirection: "asc",
      visibleProperties: getDefaultKanbanProperties(),
      filters: null
    },
    {
      id: "default-board",
      name: "Board by Status",
      layout: "board",
      groupBy: "status",
      sortBy: "manual",
      sortDirection: "asc",
      visibleProperties: getDefaultKanbanProperties(),
      filters: null
    },
    {
      id: "default-list",
      name: "This Week",
      layout: "list",
      groupBy: "dueDate",
      sortBy: "dueDate",
      sortDirection: "asc",
      visibleProperties: getDefaultKanbanProperties(),
      filters: null
    }
  ];
}

function normalizeKanbanLayout(value: string): KanbanViewLayout {
  if (value === "board") {
    return "board";
  }

  if (value === "list") {
    return "list";
  }

  return "table";
}

function normalizeKanbanGroupBy(value: string): KanbanGroupBy {
  if (value === "priority" || value === "area" || value === "type" || value === "assignee" || value === "dueDate" || value === "label") {
    return value;
  }

  return "status";
}

function normalizeKanbanSortMode(value: string): KanbanSortMode {
  if (value === "dueDate" || value === "title" || value === "assignee") {
    return value;
  }

  return "manual";
}

function getLabelValue(labels: string[], candidates: string[], fallback: string) {
  for (const label of labels) {
    const normalized = label.toLowerCase();

    for (const candidate of candidates) {
      if (normalized.includes(candidate)) {
        return label;
      }
    }
  }

  return fallback;
}

function getCardPriority(labels: string[]) {
  for (const label of labels) {
    const normalized = label.toLowerCase();

    if (normalized.startsWith("p0") || normalized.includes("critical")) {
      return label;
    }

    if (normalized.startsWith("p1") || normalized.includes("high")) {
      return label;
    }

    if (normalized.startsWith("p2") || normalized.includes("medium")) {
      return label;
    }

    if (normalized.startsWith("p3") || normalized.includes("low")) {
      return label;
    }
  }

  return "No priority";
}

function getCardType(labels: string[]) {
  return getLabelValue(labels, ["feature", "bug", "polish", "task", "chore", "research"], "Task");
}

function getCardArea(labels: string[]) {
  const ignored = ["feature", "bug", "polish", "task", "chore", "research", "critical", "high", "medium", "low"];

  for (const label of labels) {
    const normalized = label.toLowerCase();
    let shouldIgnore = normalized.startsWith("p0") || normalized.startsWith("p1") || normalized.startsWith("p2") || normalized.startsWith("p3");

    for (const item of ignored) {
      if (normalized.includes(item)) {
        shouldIgnore = true;
      }
    }

    if (!shouldIgnore) {
      return label;
    }
  }

  return "General";
}

function getRowGroupValue(row: KanbanCardRow, groupBy: KanbanGroupBy) {
  if (groupBy === "priority") {
    return row.priority;
  }

  if (groupBy === "area") {
    return row.area;
  }

  if (groupBy === "type") {
    return row.type;
  }

  if (groupBy === "assignee") {
    return row.card.assigneeLabel || "No owner";
  }

  if (groupBy === "dueDate") {
    if (row.card.dueDate) {
      return new Date(row.card.dueDate).toLocaleDateString();
    }

    return "No date";
  }

  if (groupBy === "label") {
    return row.firstLabel || "No label";
  }

  return row.status;
}

export function ProjectKanbanBoard({
  projectName,
  board,
  search,
  setSearch,
  assigneeFilter,
  setAssigneeFilter,
  labelFilter,
  setLabelFilter,
  newColumn,
  setNewColumn,
  createColumn,
  updateColumn,
  createView,
  updateView,
  deleteView,
  moveColumn,
  deleteColumn,
  newCards,
  setNewCards,
  cardEdits,
  setCardEdits,
  createCard,
  saveCard,
  moveCard,
  moveCardInColumn,
  deleteCard,
  reorderCard,
  assigneeOptions = []
}: {
  projectName: string;
  board: KanbanBoard | null;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  assigneeFilter: string;
  setAssigneeFilter: Dispatch<SetStateAction<string>>;
  labelFilter: string;
  setLabelFilter: Dispatch<SetStateAction<string>>;
  newColumn: { name: string; color: string };
  setNewColumn: Dispatch<SetStateAction<{ name: string; color: string }>>;
  createColumn: () => Promise<void>;
  updateColumn: (columnId: string, name: string, color: string | null, sortOrder: number) => Promise<void>;
  createView: (view: KanbanViewDraft) => Promise<boolean>;
  updateView: (viewId: string, view: KanbanViewDraft) => Promise<boolean>;
  deleteView: (viewId: string) => Promise<boolean>;
  moveColumn: (columnId: string, direction: "left" | "right") => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  newCards: Record<string, CardDraft>;
  setNewCards: Dispatch<SetStateAction<Record<string, CardDraft>>>;
  cardEdits: Record<string, CardEdit>;
  setCardEdits: Dispatch<SetStateAction<Record<string, CardEdit>>>;
  createCard: (columnId: string) => Promise<void>;
  saveCard: (cardId: string) => Promise<void>;
  moveCard: (cardId: string, columnId: string) => Promise<boolean>;
  moveCardInColumn: (cardId: string, direction: "up" | "down") => Promise<boolean>;
  deleteCard: (cardId: string) => Promise<void>;
  reorderCard: (cardId: string, columnId: string, targetIndex: number) => Promise<boolean>;
  assigneeOptions?: ProjectAssigneeOption[];
}) {
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [activeDragCardId, setActiveDragCardId] = useState<string | null>(null);
  const [localBoard, setLocalBoard] = useState<KanbanBoard | null>(board);
  const [activeViewId, setActiveViewId] = useState("default-table");
  const [viewName, setViewName] = useState("All Tasks");
  const [viewLayout, setViewLayout] = useState<KanbanViewLayout>("table");
  const [groupBy, setGroupBy] = useState<KanbanGroupBy>("status");
  const [sortMode, setSortMode] = useState<KanbanSortMode>("manual");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [density, setDensity] = useState<KanbanDensity>("comfortable");
  const [visibleProperties, setVisibleProperties] = useState<KanbanCardPropertyVisibility>({
    description: true,
    labels: true,
    dueDate: true,
    assignee: true,
    status: true,
    priority: true,
    area: true,
    type: true
  });
  let activeBoard = localBoard;

  if (!activeBoard) {
    activeBoard = board;
  }

  const columns = activeBoard?.columns ?? [];
  const persistedViews = activeBoard?.views ?? [];
  let views: KanbanView[] = persistedViews;

  if (views.length === 0) {
    views = getDefaultKanbanViews();
  }

  const activeView = views.find((view) => view.id === activeViewId) ?? views[0];
  const columnOptions = columns.map((column) => ({ id: column.id, name: column.name }));
  const cardsById = new Map(columns.flatMap((column) => column.cards.map((card) => [card.id, { card, column }])));
  const normalizedSearch = search.trim().toLowerCase();
  const boardSignature = useMemo(() => getBoardSignature(board), [board]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const assignees = useMemo(() => assigneeOptions.map((option) => option.label).sort(), [assigneeOptions]);

  useEffect(() => {
    setLocalBoard(board);
  }, [boardSignature]);

  useEffect(() => {
    if (!activeView) {
      return;
    }

    setActiveViewId(activeView.id);
    setViewName(activeView.name);
    setViewLayout(normalizeKanbanLayout(activeView.layout));
    setGroupBy(normalizeKanbanGroupBy(activeView.groupBy));
    setSortMode(normalizeKanbanSortMode(activeView.sortBy));

    if (activeView.sortDirection === "desc") {
      setSortDirection("desc");
    } else {
      setSortDirection("asc");
    }

    const nextProperties = getKanbanViewProperties(activeView.visibleProperties);
    setVisibleProperties({
      description: nextProperties.includes("description"),
      labels: nextProperties.includes("labels"),
      dueDate: nextProperties.includes("dueDate"),
      assignee: nextProperties.includes("assignee"),
      status: nextProperties.includes("status"),
      priority: nextProperties.includes("priority"),
      area: nextProperties.includes("area"),
      type: nextProperties.includes("type")
    });
  }, [activeViewId, boardSignature]);

  function toggleCardProperty(property: KanbanCardPropertyKey) {
    setVisibleProperties((current) => ({
      ...current,
      [property]: !current[property]
    }));
  }

  const labels = useMemo(() => {
    const names = new Set<string>();

    for (const column of columns) {
      for (const card of column.cards) {
        for (const label of getKanbanCardLabels(card.labels)) {
          names.add(label);
        }
      }
    }

    return Array.from(names).sort();
  }, [columns]);

  const allRows = useMemo(() => {
    const rows: KanbanCardRow[] = [];

    columns.forEach((column, columnIndex) => {
      for (const card of column.cards) {
        const cardLabels = getKanbanCardLabels(card.labels);
        rows.push({
          card,
          columnId: column.id,
          columnIndex,
          status: column.name,
          priority: getCardPriority(cardLabels),
          area: getCardArea(cardLabels),
          type: getCardType(cardLabels),
          firstLabel: cardLabels[0] ?? ""
        });
      }
    });

    return rows;
  }, [columns]);

  const filteredRows = useMemo(() => {
    const rows = allRows.filter((row) => {
      const cardLabels = getKanbanCardLabels(row.card.labels);
      const matchesSearch = !normalizedSearch || [
        row.card.title,
        row.card.description,
        row.card.assigneeLabel,
        row.status,
        row.priority,
        row.area,
        row.type,
        ...cardLabels
      ].filter(Boolean).join(" ").toLowerCase().includes(normalizedSearch);
      const matchesAssignee = assigneeFilter === "all" || row.card.assigneeLabel === assigneeFilter;
      const matchesLabel = labelFilter === "all" || cardLabels.includes(labelFilter);

      return matchesSearch && matchesAssignee && matchesLabel;
    });

    return [...rows].sort((left, right) => {
      const result = compareKanbanCards(left.card, right.card, sortMode);

      if (sortDirection === "desc") {
        return result * -1;
      }

      return result;
    });
  }, [allRows, assigneeFilter, labelFilter, normalizedSearch, sortDirection, sortMode]);

  const rowGroups = useMemo(() => {
    const groups = new Map<string, KanbanCardRow[]>();

    for (const row of filteredRows) {
      const key = getRowGroupValue(row, groupBy);
      const current = groups.get(key);

      if (current) {
        current.push(row);
        continue;
      }

      groups.set(key, [row]);
    }

    return Array.from(groups.entries()).map(([name, rows]) => ({ name, rows }));
  }, [filteredRows, groupBy]);

  const filteredColumns = useMemo(() => columns.map((column) => {
    const cards = column.cards.filter((card) => {
      const cardLabels = getKanbanCardLabels(card.labels);
      const matchesSearch = !normalizedSearch || [
        card.title,
        card.description,
        card.assigneeLabel,
        ...cardLabels
      ].filter(Boolean).join(" ").toLowerCase().includes(normalizedSearch);
      const matchesAssignee = assigneeFilter === "all" || card.assigneeLabel === assigneeFilter;
      const matchesLabel = labelFilter === "all" || cardLabels.includes(labelFilter);

      return matchesSearch && matchesAssignee && matchesLabel;
    });

    let sortedCards = [...cards].sort((left, right) => compareKanbanCards(left, right, sortMode));

    if (sortDirection === "desc") {
      sortedCards = sortedCards.reverse();
    }

    return {
      ...column,
      cards: sortedCards
    };
  }), [assigneeFilter, columns, labelFilter, normalizedSearch, sortDirection, sortMode]);

  const visibleCards = filteredRows.length;
  const totalCards = columns.reduce((sum, column) => sum + column.cards.length, 0);
    let resolvedValue0: any;
  if (drawer?.mode === "edit") {
    resolvedValue0 = cardsById.get(drawer.cardId);
  } else {
    resolvedValue0 = null;
  }
const activeCard = resolvedValue0;
    let resolvedValue1: any;
  if (activeDragCardId) {
    resolvedValue1 = cardsById.get(activeDragCardId);
  } else {
    resolvedValue1 = null;
  }
const activeDragCard = resolvedValue1;
    let resolvedValue2: any;
  if (drawer?.mode === "create") {
    resolvedValue2 = drawer.columnId;
  } else {
    resolvedValue2 = columns[0]?.id ?? "";
  }
const createColumnId = resolvedValue2;

  function getViewDraft(name: string): KanbanViewDraft {
    const visiblePropertyNames = (Object.keys(visibleProperties) as KanbanCardPropertyKey[]).filter((property) => visibleProperties[property]);

    return {
      name,
      layout: viewLayout,
      groupBy,
      sortBy: sortMode,
      sortDirection,
      visibleProperties: visiblePropertyNames
    };
  }

  async function createDatabaseView() {
    const name = window.prompt("Nome da nova view", "Nova view");

    if (!name?.trim()) {
      return;
    }

    const created = await createView(getViewDraft(name.trim()));

    if (created) {
      setViewName(name.trim());
    }
  }

  async function saveDatabaseView() {
    if (!viewName.trim()) {
      return;
    }

    if (activeViewId.startsWith("default-")) {
      await createView(getViewDraft(viewName.trim()));
      return;
    }

    await updateView(activeViewId, getViewDraft(viewName.trim()));
  }

  async function deleteDatabaseView() {
    if (activeViewId.startsWith("default-")) {
      return;
    }

    const deleted = await deleteView(activeViewId);

    if (deleted) {
      setActiveViewId("default-table");
    }
  }

  function onDragStart(event: DragStartEvent) {
    setActiveDragCardId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveDragCardId(null);
    const activeCardId = String(event.active.id);

    if (!event.over) {
      return;
    }

    const active = cardsById.get(activeCardId);

    if (!active) {
      return;
    }

    const overData = event.over.data.current as { type?: string; cardId?: string; columnId?: string } | undefined;
    let targetColumnId = overData?.columnId;

    if (overData?.type === "column") {
      targetColumnId = overData.columnId;
    }

    if (!targetColumnId) {
      return;
    }

    const targetColumn = columns.find((column) => column.id === targetColumnId);

    if (!targetColumn) {
      return;
    }

    const targetCards = targetColumn.cards.filter((card) => card.id !== activeCardId);
    let overCardId: string | undefined;

    if (overData?.type === "card") {
      overCardId = overData.cardId;
    }

    let overIndex = -1;

    if (overCardId) {
      overIndex = targetCards.findIndex((card) => card.id === overCardId);
    }

    let targetIndex = targetCards.length;

    if (overIndex >= 0) {
      targetIndex = overIndex;
    }

    void reorderCardWithPrediction(activeCardId, targetColumnId, targetIndex);
  }

  function onDragCancel() {
    setActiveDragCardId(null);
  }

  async function moveCardWithPrediction(cardId: string, columnId: string) {
    const previousBoard = activeBoard;

    setLocalBoard((current) => {
      if (!current) {
        return current;
      }

      return moveCardInBoard(current, cardId, columnId, Number.MAX_SAFE_INTEGER);
    });

    const ok = await moveCard(cardId, columnId);

    if (ok) {
      return true;
    }

    setLocalBoard(previousBoard);
    return false;
  }

  async function moveCardInColumnWithPrediction(cardId: string, direction: "up" | "down") {
    const previousBoard = activeBoard;

    setLocalBoard((current) => {
      if (!current) {
        return current;
      }

      return moveCardOneSlotInBoard(current, cardId, direction);
    });

    const ok = await moveCardInColumn(cardId, direction);

    if (ok) {
      return true;
    }

    setLocalBoard(previousBoard);
    return false;
  }

  async function reorderCardWithPrediction(cardId: string, columnId: string, targetIndex: number) {
    const previousBoard = activeBoard;

    setLocalBoard((current) => {
      if (!current) {
        return current;
      }

      return moveCardInBoard(current, cardId, columnId, targetIndex);
    });

    const ok = await reorderCard(cardId, columnId, targetIndex);

    if (ok) {
      return true;
    }

    setLocalBoard(previousBoard);
    return false;
  }

  function openEditDrawer(card: KanbanCard, columnId: string) {
    setCardEdits((current: any) => {
      let resolvedValue3: any;
      if (card.dueDate) {
        resolvedValue3 = new Date(card.dueDate).toISOString().slice(0, 10);
      } else {
        resolvedValue3 = "";
      }
      return ({
      ...current,
      [card.id]: current[card.id] ?? {
        title: card.title,
        description: card.description ?? "",
        assigneeLabel: card.assigneeLabel ?? "",
        dueDate: resolvedValue3,
        labels: getKanbanCardLabels(card.labels).join(", "),
        columnId
      }
    });
    });
    setDrawer({ mode: "edit", cardId: card.id });
  }

  function updateColumnFromMenu(column: KanbanColumn, sortOrder: number) {
    const name = window.prompt("Nome da coluna", column.name);

    if (name === null) {
      return;
    }

    const color = window.prompt("Cor da coluna", column.color ?? "");

    if (color === null) {
      return;
    }

    void updateColumn(column.id, name, color, sortOrder);
  }

  if (!activeBoard) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Nenhum quadro Kanban está disponível para este projeto ainda.
      </div>
    );
  }

    let resolvedValue4: any;
  if (assignees.length > 5) {
    resolvedValue4 = (
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#171b20] bg-slate-700 text-xs text-slate-200">
                  +{assignees.length - 5}
                </span>
              );
  } else {
    resolvedValue4 = null;
  }
  let resolvedValue5: any;
  if (activeDragCard) {
    resolvedValue5 = (
            <KanbanCardDragPreview card={activeDragCard.card} columnIndex={columns.findIndex((column) => column.id === activeDragCard.column.id)} />
          );
  } else {
    resolvedValue5 = null;
  }
  let statusColumnEditor = null;

  if (viewLayout === "board" && groupBy === "status") {
    statusColumnEditor = (
      <div className="border-b border-slate-800 bg-[#171b20] px-5 py-3">
        <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_120px_auto]">
          <Input
            className="border-slate-700 bg-[#11161c] text-slate-100 placeholder:text-slate-500"
            value={newColumn.name}
            onChange={(event: any) => setNewColumn((current: any) => ({ ...current, name: event.target.value }))}
            placeholder="Nome do novo status"
          />
          <Input
            className="border-slate-700 bg-[#11161c] text-slate-100 placeholder:text-slate-500"
            value={newColumn.color}
            onChange={(event: any) => setNewColumn((current: any) => ({ ...current, color: event.target.value }))}
            placeholder="#38bdf8"
          />
          <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" onClick={createColumn}>
            Adicionar status
          </Button>
        </div>
      </div>
    );
  }

  let databaseBody = null;

  if (viewLayout === "board" && groupBy === "status") {
    databaseBody = (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        autoScroll={{ enabled: true, threshold: { x: 0.18, y: 0.18 }, acceleration: 12 }}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className="h-[calc(100vh-22rem)] min-h-[520px] overflow-x-auto bg-[#0f1317] p-5">
          <div className="flex h-full min-w-max gap-3">
            {filteredColumns.map((column, index) => (
              <KanbanColumnView
                key={column.id}
                column={column}
                index={index}
                canMoveLeft={index > 0}
                canMoveRight={index < filteredColumns.length - 1}
                onCreate={() => setDrawer({ mode: "create", columnId: column.id })}
                onEditColumn={() => updateColumnFromMenu(column, index)}
                onMoveColumn={moveColumn}
                onDeleteColumn={deleteColumn}
                onOpenCard={openEditDrawer}
                onMoveCard={moveCardWithPrediction}
                onMoveCardInColumn={moveCardInColumnWithPrediction}
                onDeleteCard={deleteCard}
                columnOptions={columnOptions}
                visibleProperties={visibleProperties}
                density={density}
              />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {resolvedValue5}
        </DragOverlay>
      </DndContext>
    );
  }

  if (viewLayout === "board" && groupBy !== "status") {
    databaseBody = (
      <KanbanGroupedBoardView
        groups={rowGroups}
        visibleProperties={visibleProperties}
        density={density}
        onOpenCard={openEditDrawer}
        onCreate={() => setDrawer({ mode: "create", columnId: columns[0]?.id ?? "" })}
      />
    );
  }

  if (viewLayout === "table") {
    databaseBody = (
      <KanbanTableView
        projectName={projectName}
        rows={filteredRows}
        visibleProperties={visibleProperties}
        onOpenCard={openEditDrawer}
      />
    );
  }

  if (viewLayout === "list") {
    databaseBody = (
      <KanbanListView
        groups={rowGroups}
        visibleProperties={visibleProperties}
        density={density}
        onOpenCard={openEditDrawer}
      />
    );
  }
return (
    <div className="overflow-hidden rounded-lg border bg-[#101418] text-slate-200 shadow-sm">
      <div className="border-b border-slate-800 bg-[#171b20] px-5 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs text-slate-400">Neo Soft Entertainment / Development / {projectName}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-100">Production</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex -space-x-2">
              {assignees.slice(0, 5).map((assignee) => (
                <span key={assignee} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#171b20] bg-sky-500 text-xs font-semibold text-white">
                  {assignee.slice(0, 1).toUpperCase()}
                </span>
              ))}
              {resolvedValue4}
            </div>
            <Button className="bg-sky-500 text-slate-950 hover:bg-sky-400" onClick={() => setDrawer({ mode: "create", columnId: columns[0]?.id ?? "" })}>
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {views.map((view) => (
            <Button
              key={view.id}
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                "h-8 rounded-full px-3 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                activeViewId === view.id && "bg-slate-700 text-white"
              )}
              onClick={() => setActiveViewId(view.id)}
            >
              {view.name}
            </Button>
          ))}
          <Button type="button" size="sm" variant="ghost" className="h-8 rounded-full px-3 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100" onClick={createDatabaseView}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            New view
          </Button>
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(220px,1fr)_150px_150px_150px_150px_150px_auto]">
          <Input
            className="border-slate-700 bg-[#11161c] text-slate-100 placeholder:text-slate-500"
            value={viewName}
            onChange={(event: any) => setViewName(event.target.value)}
            placeholder="View name"
          />
          <Select value={viewLayout} onValueChange={(value: KanbanViewLayout) => setViewLayout(value)}>
            <SelectTrigger className="border-slate-700 bg-[#11161c] text-slate-100">
              <SelectValue placeholder="Layout" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="table">Table</SelectItem>
              <SelectItem value="board">Board</SelectItem>
              <SelectItem value="list">List</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={(value: KanbanGroupBy) => setGroupBy(value)}>
            <SelectTrigger className="border-slate-700 bg-[#11161c] text-slate-100">
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="area">Area</SelectItem>
              <SelectItem value="type">Type</SelectItem>
              <SelectItem value="assignee">Owner</SelectItem>
              <SelectItem value="dueDate">Date</SelectItem>
              <SelectItem value="label">Label</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortMode} onValueChange={(value: KanbanSortMode) => setSortMode(value)}>
            <SelectTrigger className="border-slate-700 bg-[#11161c] text-slate-100">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="dueDate">Due date</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="assignee">Owner</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortDirection} onValueChange={(value: "asc" | "desc") => setSortDirection(value)}>
            <SelectTrigger className="border-slate-700 bg-[#11161c] text-slate-100">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
          <Select value={density} onValueChange={(value: KanbanDensity) => setDensity(value)}>
            <SelectTrigger className="border-slate-700 bg-[#11161c] text-slate-100">
              <SelectValue placeholder="Density" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" onClick={saveDatabaseView}>
              Save
            </Button>
            <Button type="button" variant="ghost" className="text-slate-400 hover:bg-slate-800 hover:text-slate-100" disabled={activeViewId.startsWith("default-")} onClick={deleteDatabaseView}>
              Delete
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              className="border-slate-700 bg-[#11161c] pl-9 text-slate-100 placeholder:text-slate-500"
              value={search}
              onChange={(event: any) => setSearch(event.target.value)}
              placeholder="Pesquisar no quadro"
            />
          </div>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="border-slate-700 bg-[#11161c] text-slate-100">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {assignees.map((assignee) => (
                <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={labelFilter} onValueChange={setLabelFilter}>
            <SelectTrigger className="border-slate-700 bg-[#11161c] text-slate-100">
              <SelectValue placeholder="Etiqueta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as etiquetas</SelectItem>
              {labels.map((label) => (
                <SelectItem key={label} value={label}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center justify-end text-xs text-slate-400">
            {formatNumber(visibleCards)} de {formatNumber(totalCards)} cartões
          </div>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)]">
          <div className="flex flex-wrap items-center gap-2">
            {(["status", "priority", "area", "type", "assignee", "dueDate", "labels", "description"] as KanbanCardPropertyKey[]).map((property) => (
              <Button
                key={property}
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  "border-slate-700 bg-[#11161c] text-slate-300 hover:bg-slate-800 hover:text-slate-100",
                  visibleProperties[property] && "border-sky-400/50 bg-sky-400/10 text-sky-100"
                )}
                onClick={() => toggleCardProperty(property)}
              >
                {property}
              </Button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Views salvas mudam layout, agrupamento, ordenação e propriedades. Drag-and-drop fica ativo no board agrupado por status.
        </p>
      </div>
      {statusColumnEditor}
      {databaseBody}

      <KanbanCardDrawer
        drawer={drawer}
        setDrawer={setDrawer}
        columns={columns}
        activeCard={activeCard?.card ?? null}
        activeCardColumnId={activeCard?.column.id ?? ""}
        assigneeOptions={assigneeOptions}
        createColumnId={createColumnId}
        newCards={newCards}
        setNewCards={setNewCards}
        cardEdits={cardEdits}
        setCardEdits={setCardEdits}
        createCard={createCard}
        saveCard={saveCard}
      />
    </div>
  );
}

function KanbanPropertyBadge({ value }: { value: string }) {
  if (!value) {
    return <span className="text-slate-600">Empty</span>;
  }

  return (
    <span className={cn("inline-flex w-fit rounded px-1.5 py-0.5 text-[11px] font-semibold", getLabelClass(value))}>
      {value}
    </span>
  );
}

function KanbanRowMeta({
  row,
  visibleProperties
}: {
  row: KanbanCardRow;
  visibleProperties: KanbanCardPropertyVisibility;
}) {
  const labels = getKanbanCardLabels(row.card.labels);
  const properties = [];

  if (visibleProperties.status) {
    properties.push(<KanbanPropertyBadge key="status" value={row.status} />);
  }

  if (visibleProperties.priority) {
    properties.push(<KanbanPropertyBadge key="priority" value={row.priority} />);
  }

  if (visibleProperties.area) {
    properties.push(<KanbanPropertyBadge key="area" value={row.area} />);
  }

  if (visibleProperties.type) {
    properties.push(<KanbanPropertyBadge key="type" value={row.type} />);
  }

  if (visibleProperties.assignee && row.card.assigneeLabel) {
    properties.push(<span key="assignee">{row.card.assigneeLabel}</span>);
  }

  if (visibleProperties.dueDate && row.card.dueDate) {
    properties.push(<span key="dueDate">{new Date(row.card.dueDate).toLocaleDateString()}</span>);
  }

  if (visibleProperties.labels) {
    for (const label of labels.slice(0, 4)) {
      properties.push(<KanbanPropertyBadge key={label} value={label} />);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
      {properties}
    </div>
  );
}

function KanbanTableView({
  projectName,
  rows,
  visibleProperties,
  onOpenCard
}: {
  projectName: string;
  rows: KanbanCardRow[];
  visibleProperties: KanbanCardPropertyVisibility;
  onOpenCard: (card: KanbanCard, columnId: string) => void;
}) {
  const headers = [
    <th key="task" className="w-[320px] px-3 py-2">Task</th>,
    <th key="project" className="px-3 py-2">Project</th>
  ];

  if (visibleProperties.status) {
    headers.push(<th key="status" className="px-3 py-2">Status</th>);
  }

  if (visibleProperties.priority) {
    headers.push(<th key="priority" className="px-3 py-2">Priority</th>);
  }

  if (visibleProperties.area) {
    headers.push(<th key="area" className="px-3 py-2">Area</th>);
  }

  if (visibleProperties.type) {
    headers.push(<th key="type" className="px-3 py-2">Type</th>);
  }

  if (visibleProperties.assignee) {
    headers.push(<th key="assignee" className="px-3 py-2">Owner</th>);
  }

  if (visibleProperties.dueDate) {
    headers.push(<th key="dueDate" className="px-3 py-2">Milestone</th>);
  }

  return (
    <div className="min-h-[520px] overflow-auto bg-[#0f1317] p-5">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-xs font-medium text-slate-400">
            {headers}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <KanbanTableRow
              key={row.card.id}
              projectName={projectName}
              row={row}
              visibleProperties={visibleProperties}
              onOpenCard={onOpenCard}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KanbanTableRow({
  projectName,
  row,
  visibleProperties,
  onOpenCard
}: {
  projectName: string;
  row: KanbanCardRow;
  visibleProperties: KanbanCardPropertyVisibility;
  onOpenCard: (card: KanbanCard, columnId: string) => void;
}) {
  let descriptionLine = null;

  if (visibleProperties.description && row.card.description) {
    descriptionLine = <p className="mt-1 line-clamp-1 text-xs text-slate-500">{row.card.description}</p>;
  }

  const cells = [
    <td key="task" className="px-3 py-2">
      <button type="button" className="font-medium text-slate-100 hover:underline" onClick={() => onOpenCard(row.card, row.columnId)}>
        {row.card.title}
      </button>
      {descriptionLine}
    </td>,
    <td key="project" className="px-3 py-2 text-slate-300">{projectName}</td>
  ];

  if (visibleProperties.status) {
    cells.push(<td key="status" className="px-3 py-2"><KanbanPropertyBadge value={row.status} /></td>);
  }

  if (visibleProperties.priority) {
    cells.push(<td key="priority" className="px-3 py-2"><KanbanPropertyBadge value={row.priority} /></td>);
  }

  if (visibleProperties.area) {
    cells.push(<td key="area" className="px-3 py-2"><KanbanPropertyBadge value={row.area} /></td>);
  }

  if (visibleProperties.type) {
    cells.push(<td key="type" className="px-3 py-2"><KanbanPropertyBadge value={row.type} /></td>);
  }

  if (visibleProperties.assignee) {
    cells.push(<td key="assignee" className="px-3 py-2 text-slate-300">{row.card.assigneeLabel ?? "No owner"}</td>);
  }

  if (visibleProperties.dueDate) {
    let dueDateLabel = "No date";

    if (row.card.dueDate) {
      dueDateLabel = new Date(row.card.dueDate).toLocaleDateString();
    }

    cells.push(<td key="dueDate" className="px-3 py-2 text-slate-300">{dueDateLabel}</td>);
  }

  return (
    <tr className="border-b border-slate-800/80 hover:bg-slate-800/30">
      {cells}
    </tr>
  );
}

function KanbanListView({
  groups,
  visibleProperties,
  density,
  onOpenCard
}: {
  groups: Array<{ name: string; rows: KanbanCardRow[] }>;
  visibleProperties: KanbanCardPropertyVisibility;
  density: KanbanDensity;
  onOpenCard: (card: KanbanCard, columnId: string) => void;
}) {
  return (
    <div className="min-h-[520px] space-y-4 overflow-auto bg-[#0f1317] p-5">
      {groups.map((group) => (
        <section key={group.name} className="rounded-lg border border-slate-800 bg-[#151a1f]">
          <header className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
            <p className="font-semibold text-slate-200">{group.name}</p>
            <span className="text-xs text-slate-500">{formatNumber(group.rows.length)}</span>
          </header>
          <div className="divide-y divide-slate-800">
            {group.rows.map((row) => (
              <KanbanListRow
                key={row.card.id}
                row={row}
                visibleProperties={visibleProperties}
                density={density}
                onOpenCard={onOpenCard}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function KanbanListRow({
  row,
  visibleProperties,
  density,
  onOpenCard
}: {
  row: KanbanCardRow;
  visibleProperties: KanbanCardPropertyVisibility;
  density: KanbanDensity;
  onOpenCard: (card: KanbanCard, columnId: string) => void;
}) {
  let descriptionLine = null;

  if (visibleProperties.description && density === "comfortable" && row.card.description) {
    descriptionLine = <p className="mt-1 line-clamp-2 text-sm text-slate-500">{row.card.description}</p>;
  }

  return (
    <button type="button" className="block w-full px-4 py-3 text-left hover:bg-slate-800/40" onClick={() => onOpenCard(row.card, row.columnId)}>
      <p className="font-medium text-slate-100">{row.card.title}</p>
      {descriptionLine}
      <div className="mt-2">
        <KanbanRowMeta row={row} visibleProperties={visibleProperties} />
      </div>
    </button>
  );
}

function KanbanGroupedBoardView({
  groups,
  visibleProperties,
  density,
  onOpenCard,
  onCreate
}: {
  groups: Array<{ name: string; rows: KanbanCardRow[] }>;
  visibleProperties: KanbanCardPropertyVisibility;
  density: KanbanDensity;
  onOpenCard: (card: KanbanCard, columnId: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="h-[calc(100vh-22rem)] min-h-[520px] overflow-x-auto bg-[#0f1317] p-5">
      <div className="flex h-full min-w-max gap-3">
        {groups.map((group) => (
          <section key={group.name} className="flex h-full w-[286px] shrink-0 flex-col rounded-md bg-[#151a1f] shadow-sm">
            <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-3 py-3">
              <div className="flex items-center gap-2">
                <KanbanPropertyBadge value={group.name} />
                <span className="text-xs text-slate-500">{formatNumber(group.rows.length)}</span>
              </div>
            </header>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
              {group.rows.map((row) => (
                <KanbanGroupedBoardCard
                  key={row.card.id}
                  row={row}
                  visibleProperties={visibleProperties}
                  density={density}
                  onOpenCard={onOpenCard}
                />
              ))}
              <Button variant="ghost" className="w-full justify-start text-slate-400 hover:bg-slate-800 hover:text-slate-100" onClick={onCreate}>
                <Plus className="mr-2 h-4 w-4" />
                New page
              </Button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function KanbanGroupedBoardCard({
  row,
  visibleProperties,
  density,
  onOpenCard
}: {
  row: KanbanCardRow;
  visibleProperties: KanbanCardPropertyVisibility;
  density: KanbanDensity;
  onOpenCard: (card: KanbanCard, columnId: string) => void;
}) {
  let descriptionLine = null;

  if (visibleProperties.description && density === "comfortable" && row.card.description) {
    descriptionLine = <p className="mt-2 line-clamp-2 text-xs text-slate-400">{row.card.description}</p>;
  }

  return (
    <button type="button" className="w-full rounded-md border border-slate-700 bg-[#22272d] p-3 text-left text-sm shadow-sm hover:border-slate-600 hover:bg-[#282e35]" onClick={() => onOpenCard(row.card, row.columnId)}>
      <p className="line-clamp-2 font-medium leading-5 text-slate-200">{row.card.title}</p>
      {descriptionLine}
      <div className="mt-2">
        <KanbanRowMeta row={row} visibleProperties={visibleProperties} />
      </div>
    </button>
  );
}

function KanbanColumnView({
  column,
  index,
  canMoveLeft,
  canMoveRight,
  onCreate,
  onEditColumn,
  onMoveColumn,
  onDeleteColumn,
  onOpenCard,
  onMoveCard,
  onMoveCardInColumn,
  onDeleteCard,
  columnOptions,
  visibleProperties,
  density
}: {
  column: KanbanColumn;
  index: number;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onCreate: () => void;
  onEditColumn: () => void;
  onMoveColumn: (columnId: string, direction: "left" | "right") => Promise<void>;
  onDeleteColumn: (columnId: string) => Promise<void>;
  onOpenCard: (card: KanbanCard, columnId: string) => void;
  onMoveCard: (cardId: string, columnId: string) => Promise<boolean>;
  onMoveCardInColumn: (cardId: string, direction: "up" | "down") => Promise<boolean>;
  onDeleteCard: (cardId: string) => Promise<void>;
  columnOptions: Array<{ id: string; name: string }>;
  visibleProperties: KanbanCardPropertyVisibility;
  density: KanbanDensity;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      columnId: column.id
    }
  });

  return (
    <section className="flex h-full w-[286px] shrink-0 flex-col rounded-md bg-[#151a1f] shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-3 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color || "#38bdf8" }} />
            <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-slate-300">{column.name}</h3>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">{column.cards.length}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:bg-slate-800 hover:text-slate-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEditColumn}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar status
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canMoveLeft} onClick={() => void onMoveColumn(column.id, "left")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Mover para esquerda
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canMoveRight} onClick={() => void onMoveColumn(column.id, "right")}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Mover para direita
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void onDeleteColumn(column.id)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir status
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <div ref={setNodeRef} className={cn("min-h-0 flex-1 space-y-2 overflow-y-auto p-2 transition-colors", isOver && "bg-sky-500/5")}>
        <SortableContext items={column.cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <KanbanCardView
              key={card.id}
              card={card}
              columnId={column.id}
              columnIndex={index}
              onOpen={() => onOpenCard(card, column.id)}
              onMoveCard={onMoveCard}
              onMoveCardInColumn={onMoveCardInColumn}
              onDeleteCard={onDeleteCard}
              columnOptions={columnOptions}
              visibleProperties={visibleProperties}
              density={density}
            />
          ))}
        </SortableContext>
        <Button variant="ghost" className="w-full justify-start text-slate-400 hover:bg-slate-800 hover:text-slate-100" onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Criar
        </Button>
      </div>
    </section>
  );
}

function KanbanCardView({
  card,
  columnId,
  columnIndex,
  onOpen,
  onMoveCard,
  onMoveCardInColumn,
  onDeleteCard,
  columnOptions,
  visibleProperties,
  density
}: {
  card: KanbanCard;
  columnId: string;
  columnIndex: number;
  onOpen: () => void;
  onMoveCard: (cardId: string, columnId: string) => Promise<boolean>;
  onMoveCardInColumn: (cardId: string, direction: "up" | "down") => Promise<boolean>;
  onDeleteCard: (cardId: string) => Promise<void>;
  columnOptions: Array<{ id: string; name: string }>;
  visibleProperties: KanbanCardPropertyVisibility;
  density: KanbanDensity;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: card.id,
    data: {
      type: "card",
      cardId: card.id,
      columnId
    }
  });
  const labels = getKanbanCardLabels(card.labels);

    let resolvedValue6: any;
  if (visibleProperties.labels && labels.length > 0) {
        let resolvedValue27: any;
    if (labels.length > 3) {
      resolvedValue27 = <span className="text-[11px] text-slate-500">+{labels.length - 3}</span>;
    } else {
      resolvedValue27 = null;
    }
resolvedValue6 = (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {labels.slice(0, 3).map((label) => (
            <span key={label} className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", getLabelClass(label))}>
              {label}
            </span>
          ))}
          {resolvedValue27}
        </div>
      );
  } else {
    resolvedValue6 = null;
  }
  let resolvedValue7: any;
  if (visibleProperties.dueDate && card.dueDate) {
    resolvedValue7 = (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {new Date(card.dueDate).toLocaleDateString()}
            </span>
          );
  } else {
    resolvedValue7 = null;
  }
  let resolvedValue8: any;
  if (visibleProperties.assignee && card.assigneeLabel) {
    resolvedValue8 = (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-[10px] font-semibold text-white">
              {card.assigneeLabel.slice(0, 1).toUpperCase()}
            </span>
          );
  } else if (visibleProperties.assignee) {
    resolvedValue8 = (
            <User2 className="h-4 w-4 text-slate-600" />
          );
  } else {
    resolvedValue8 = null;
  }
  let resolvedValue29: any;
  if (visibleProperties.description && density === "comfortable" && card.description) {
    resolvedValue29 = (
      <p className="mt-2 line-clamp-2 text-xs text-slate-400">{card.description}</p>
    );
  } else {
    resolvedValue29 = null;
  }
return (
    <article
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      className={cn(
        "group cursor-grab rounded-md border border-slate-700 bg-[#22272d] p-3 text-sm shadow-sm transition hover:border-slate-600 hover:bg-[#282e35] active:cursor-grabbing",
        density === "compact" && "p-2",
        isDragging && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-slate-500" aria-hidden="true">
          <GripVertical className="h-4 w-4" />
        </span>
        <button className="min-w-0 flex-1 text-left" type="button" onClick={onOpen}>
          <p className="line-clamp-2 font-medium leading-5 text-slate-200">{card.title}</p>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-slate-500 opacity-0 hover:bg-slate-700 hover:text-slate-100 group-hover:opacity-100"
              onPointerDown={(event: any) => event.stopPropagation()}
              onClick={(event: any) => event.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpen}>Abrir</DropdownMenuItem>
            <DropdownMenuItem onClick={() => void onMoveCardInColumn(card.id, "up")}>Mover para cima</DropdownMenuItem>
            <DropdownMenuItem onClick={() => void onMoveCardInColumn(card.id, "down")}>Mover para baixo</DropdownMenuItem>
            <DropdownMenuSeparator />
            {columnOptions.map((column) => (
              <DropdownMenuItem key={column.id} disabled={column.id === columnId} onClick={() => void onMoveCard(card.id, column.id)}>
                Mover para {column.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void onDeleteCard(card.id)}>Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {resolvedValue29}
      {resolvedValue6}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-400">
        <span className="font-medium text-slate-500">NLY-{columnIndex + 1}{String(card.sortOrder + 1).padStart(2, "0")}</span>
        <div className="flex items-center gap-2">
          {resolvedValue7}
          {resolvedValue8}
        </div>
      </div>
    </article>
  );
}

function KanbanCardDragPreview({
  card,
  columnIndex
}: {
  card: KanbanCard;
  columnIndex: number;
}) {
  const labels = getKanbanCardLabels(card.labels);

    let resolvedValue9: any;
  if (labels.length > 0) {
    resolvedValue9 = (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {labels.slice(0, 3).map((label) => (
            <span key={label} className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", getLabelClass(label))}>
              {label}
            </span>
          ))}
        </div>
      );
  } else {
    resolvedValue9 = null;
  }
  let resolvedValue10: any;
  if (card.assigneeLabel) {
    resolvedValue10 = (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-[10px] font-semibold text-white">
            {card.assigneeLabel.slice(0, 1).toUpperCase()}
          </span>
        );
  } else {
    resolvedValue10 = null;
  }
return (
    <article className="w-[260px] rotate-1 rounded-md border border-sky-500/60 bg-[#22272d] p-3 text-sm text-slate-200 shadow-2xl">
      <p className="line-clamp-2 font-medium leading-5">{card.title}</p>
      {resolvedValue9}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-400">
        <span className="font-medium text-slate-500">NLY-{columnIndex + 1}{String(card.sortOrder + 1).padStart(2, "0")}</span>
        {resolvedValue10}
      </div>
    </article>
  );
}

function KanbanCardDrawer({
  drawer,
  setDrawer,
  columns,
  activeCard,
  activeCardColumnId,
  assigneeOptions,
  createColumnId,
  newCards,
  setNewCards,
  cardEdits,
  setCardEdits,
  createCard,
  saveCard
}: {
  drawer: DrawerState;
  setDrawer: Dispatch<SetStateAction<DrawerState>>;
  columns: KanbanColumn[];
  activeCard: KanbanCard | null;
  activeCardColumnId: string;
  assigneeOptions: ProjectAssigneeOption[];
  createColumnId: string;
  newCards: Record<string, CardDraft>;
  setNewCards: Dispatch<SetStateAction<Record<string, CardDraft>>>;
  cardEdits: Record<string, CardEdit>;
  setCardEdits: Dispatch<SetStateAction<Record<string, CardEdit>>>;
  createCard: (columnId: string) => Promise<void>;
  saveCard: (cardId: string) => Promise<void>;
}) {
  const isOpen = Boolean(drawer);
  const isEdit = drawer?.mode === "edit";
    let resolvedValue11: any;
  if (activeCard) {
    resolvedValue11 = cardEdits[activeCard.id];
  } else {
    resolvedValue11 = null;
  }
const editState = resolvedValue11;
  const createState = newCards[createColumnId] ?? {
    title: "",
    description: "",
    assigneeLabel: "",
    dueDate: "",
    labels: ""
  };
    let resolvedValue12: any;
  if (isEdit) {
    resolvedValue12 = editState?.assigneeLabel ?? activeCard?.assigneeLabel ?? "";
  } else {
    resolvedValue12 = createState.assigneeLabel;
  }
const selectedAssigneeLabel = resolvedValue12;

  async function submit() {
    if (drawer?.mode === "create") {
      if (!createState.title.trim()) {
        await createCard(drawer.columnId);
        return;
      }

      void createCard(drawer.columnId);
      setDrawer(null);
      return;
    }

    if (drawer?.mode === "edit") {
      let title = "";

      if (activeCard) {
        title = activeCard.title;
      }

      if (editState?.title !== undefined) {
        title = editState.title;
      }

      if (!title.trim()) {
        await saveCard(drawer.cardId);
        return;
      }

      void saveCard(drawer.cardId);
      setDrawer(null);
    }
  }

  function updateCreate(field: keyof CardDraft, value: string) {
    if (drawer?.mode !== "create") {
      return;
    }

    setNewCards((current: any) => ({
      ...current,
      [drawer.columnId]: {
        title: current[drawer.columnId]?.title ?? "",
        description: current[drawer.columnId]?.description ?? "",
        assigneeLabel: current[drawer.columnId]?.assigneeLabel ?? "",
        dueDate: current[drawer.columnId]?.dueDate ?? "",
        labels: current[drawer.columnId]?.labels ?? "",
        [field]: value
      }
    }));
  }

  function updateEdit(field: keyof CardEdit, value: string) {
    if (!activeCard) {
      return;
    }

    setCardEdits((current: any) => {
      let resolvedValue13: any;
      if (activeCard.dueDate) {
        resolvedValue13 = new Date(activeCard.dueDate).toISOString().slice(0, 10);
      } else {
        resolvedValue13 = "";
      }
      return ({
      ...current,
      [activeCard.id]: {
        title: current[activeCard.id]?.title ?? activeCard.title,
        description: current[activeCard.id]?.description ?? activeCard.description ?? "",
        assigneeLabel: current[activeCard.id]?.assigneeLabel ?? activeCard.assigneeLabel ?? "",
        dueDate: current[activeCard.id]?.dueDate ?? (resolvedValue13),
        labels: current[activeCard.id]?.labels ?? getKanbanCardLabels(activeCard.labels).join(", "),
        columnId: current[activeCard.id]?.columnId ?? activeCardColumnId,
        [field]: value
      }
    });
    });
  }

    let resolvedValue14: any;
  if (isEdit) {
    resolvedValue14 = "Editar card";
  } else {
    resolvedValue14 = "Criar card";
  }
  let resolvedValue15: any;
  if (isEdit) {
    resolvedValue15 = "Atualize os detalhes de execução sem sair do quadro.";
  } else {
    resolvedValue15 = "Adicione um item de trabalho ao status selecionado.";
  }
  let resolvedValue16: any;
  if (isEdit) {
    resolvedValue16 = editState?.columnId ?? activeCardColumnId;
  } else {
    resolvedValue16 = createColumnId;
  }
  let resolvedValue17: any;
  if (isEdit) {
    resolvedValue17 = editState?.title ?? activeCard?.title ?? "";
  } else {
    resolvedValue17 = createState.title;
  }
  let resolvedValue19: any;
  if (isEdit) {
    resolvedValue19 = editState?.description ?? activeCard?.description ?? "";
  } else {
    resolvedValue19 = createState.description;
  }
  let resolvedValue22: any;
  if (isEdit) {
        let resolvedValue28: any;
    if (activeCard?.dueDate) {
      resolvedValue28 = new Date(activeCard.dueDate).toISOString().slice(0, 10);
    } else {
      resolvedValue28 = "";
    }
resolvedValue22 = editState?.dueDate ?? (resolvedValue28);
  } else {
    resolvedValue22 = createState.dueDate;
  }
  let resolvedValue24: any;
  if (isEdit) {
    resolvedValue24 = editState?.labels ?? getKanbanCardLabels(activeCard?.labels).join(", ");
  } else {
    resolvedValue24 = createState.labels;
  }
  let resolvedValue26: any;
  if (isEdit) {
    resolvedValue26 = "Salvar card";
  } else {
    resolvedValue26 = "Criar card";
  }
return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && setDrawer(null)}>
      <DialogContent className="left-auto right-0 top-0 h-screen max-w-xl translate-x-0 translate-y-0 overflow-y-auto rounded-none border-y-0 border-r-0 bg-card p-0 sm:max-w-xl">
        <DialogHeader className="border-b p-5">
          <DialogTitle>{resolvedValue14}</DialogTitle>
          <DialogDescription>{resolvedValue15}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 p-5">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={resolvedValue16}
              onValueChange={(value: any) => {
                if (drawer?.mode === "create") {
                  setDrawer({ mode: "create", columnId: value });
                  return;
                }

                updateEdit("columnId", value);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem key={column.id} value={column.id}>{column.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={resolvedValue17}
              onChange={(event: any) => {
                let resolvedValue18: any;
                if (isEdit) {
                  resolvedValue18 = updateEdit("title", event.target.value);
                } else {
                  resolvedValue18 = updateCreate("title", event.target.value);
                }
                return resolvedValue18;
              }}
              placeholder="Título do card"
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              className="min-h-32"
              value={resolvedValue19}
              onChange={(event: any) => {
                let resolvedValue20: any;
                if (isEdit) {
                  resolvedValue20 = updateEdit("description", event.target.value);
                } else {
                  resolvedValue20 = updateCreate("description", event.target.value);
                }
                return resolvedValue20;
              }}
              placeholder="Descreva o trabalho, risco ou decisão."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Responsável</Label>
              <ProjectAssigneeSelect
                value={selectedAssigneeLabel}
                onChange={(value: any) => {
                  let resolvedValue21: any;
                  if (isEdit) {
                    resolvedValue21 = updateEdit("assigneeLabel", value);
                  } else {
                    resolvedValue21 = updateCreate("assigneeLabel", value);
                  }
                  return resolvedValue21;
                }}
                assigneeOptions={assigneeOptions}
                placeholder="Selecionar usuário"
              />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input
                type="date"
                value={resolvedValue22}
                onChange={(event: any) => {
                  let resolvedValue23: any;
                  if (isEdit) {
                    resolvedValue23 = updateEdit("dueDate", event.target.value);
                  } else {
                    resolvedValue23 = updateCreate("dueDate", event.target.value);
                  }
                  return resolvedValue23;
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <Input
              value={resolvedValue24}
              onChange={(event: any) => {
                let resolvedValue25: any;
                if (isEdit) {
                  resolvedValue25 = updateEdit("labels", event.target.value);
                } else {
                  resolvedValue25 = updateCreate("labels", event.target.value);
                }
                return resolvedValue25;
              }}
              placeholder="billing, feedback, forms"
            />
          </div>
        </div>
        <DialogFooter className="border-t p-5">
          <Button variant="outline" onClick={() => setDrawer(null)}>Cancelar</Button>
          <Button onClick={submit}>{resolvedValue26}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getLabelClass(label: string) {
  const classes = [
    "bg-sky-400 text-slate-950",
    "bg-emerald-400 text-slate-950",
    "bg-violet-300 text-slate-950",
    "bg-amber-300 text-slate-950",
    "bg-rose-300 text-slate-950"
  ];

  return classes[label.length % classes.length];
}

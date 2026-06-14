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
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";

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
  moveColumn: (columnId: string, direction: "left" | "right") => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  newCards: Record<string, CardDraft>;
  setNewCards: Dispatch<SetStateAction<Record<string, CardDraft>>>;
  cardEdits: Record<string, CardEdit>;
  setCardEdits: Dispatch<SetStateAction<Record<string, CardEdit>>>;
  createCard: (columnId: string) => Promise<void>;
  saveCard: (cardId: string) => Promise<void>;
  moveCard: (cardId: string, columnId: string) => Promise<void>;
  moveCardInColumn: (cardId: string, direction: "up" | "down") => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  reorderCard: (cardId: string, columnId: string, targetIndex: number) => Promise<void>;
  assigneeOptions?: ProjectAssigneeOption[];
}) {
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [activeDragCardId, setActiveDragCardId] = useState<string | null>(null);
  const columns = board?.columns ?? [];
  const columnOptions = columns.map((column) => ({ id: column.id, name: column.name }));
  const cardsById = new Map(columns.flatMap((column) => column.cards.map((card) => [card.id, { card, column }])));
  const normalizedSearch = search.trim().toLowerCase();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const assignees = useMemo(() => assigneeOptions.map((option) => option.label).sort(), [assigneeOptions]);

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

  const filteredColumns = useMemo(() => columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) => {
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
    })
  })), [assigneeFilter, columns, labelFilter, normalizedSearch]);

  const visibleCards = filteredColumns.reduce((sum, column) => sum + column.cards.length, 0);
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

    void reorderCard(activeCardId, targetColumnId, targetIndex);
  }

  function onDragCancel() {
    setActiveDragCardId(null);
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

  if (!board) {
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
return (
    <div className="overflow-hidden rounded-lg border bg-[#101418] text-slate-200 shadow-sm">
      <div className="border-b border-slate-800 bg-[#171b20] px-5 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs text-slate-400">Projetos / {projectName}</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-100">Quadro</h2>
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
              Criar
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px_auto]">
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
      </div>

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
                onMoveCard={moveCard}
                onMoveCardInColumn={moveCardInColumn}
                onDeleteCard={deleteCard}
                columnOptions={columnOptions}
              />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {resolvedValue5}
        </DragOverlay>
      </DndContext>

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
  columnOptions
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
  onMoveCard: (cardId: string, columnId: string) => Promise<void>;
  onMoveCardInColumn: (cardId: string, direction: "up" | "down") => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
  columnOptions: Array<{ id: string; name: string }>;
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
  columnOptions
}: {
  card: KanbanCard;
  columnId: string;
  columnIndex: number;
  onOpen: () => void;
  onMoveCard: (cardId: string, columnId: string) => Promise<void>;
  onMoveCardInColumn: (cardId: string, direction: "up" | "down") => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
  columnOptions: Array<{ id: string; name: string }>;
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
  if (labels.length > 0) {
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
  if (card.dueDate) {
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
  if (card.assigneeLabel) {
    resolvedValue8 = (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-[10px] font-semibold text-white">
              {card.assigneeLabel.slice(0, 1).toUpperCase()}
            </span>
          );
  } else {
    resolvedValue8 = (
            <User2 className="h-4 w-4 text-slate-600" />
          );
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

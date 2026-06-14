import type { ProjectOverviewFormState } from "@/features/projects/types";

export type ProjectActionResult = {
  ok: boolean;
  message?: string;
};

export type ProjectMilestoneDraft = {
  title: string;
  description: string;
  ownerLabel: string;
  status: string;
  dueAt: string;
  budgetedCostCents: string;
  expectedRevenueCents: string;
};

export type ProjectKanbanCardDraft = {
  title: string;
  description: string;
  assigneeLabel: string;
  dueDate: string;
  labels: string;
};

async function toProjectActionResult(response: Response): Promise<ProjectActionResult> {
  if (response.ok) {
    return { ok: true };
  }

  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  return {
    ok: false,
    message: payload?.message
  };
}

async function projectJsonRequest(url: string, method: "PATCH" | "POST", body?: unknown) {
  return toProjectActionResult(await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  }));
}

function parseLabels(labels: string) {
  return labels
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function saveProjectOverview(projectId: string, form: ProjectOverviewFormState) {
  return projectJsonRequest(`/api/projects/${projectId}`, "PATCH", {
    ...form,
    pricePointCents: form.pricePointCents ? Number(form.pricePointCents) : null
  });
}

export function runProjectAnalysis(projectId: string) {
  return projectJsonRequest(`/api/projects/${projectId}/analysis`, "POST");
}

export function generateProjectGdd(projectId: string) {
  return projectJsonRequest(`/api/projects/${projectId}/gdd`, "POST");
}

export function runProjectArtAnalysis(projectId: string) {
  return projectJsonRequest(`/api/projects/${projectId}/art-analysis`, "POST");
}

export async function uploadProjectArtAsset(projectId: string, file: File, kind: string, notes: string) {
  const payload = new FormData();
  payload.append("file", file);
  payload.append("kind", kind);
  payload.append("notes", notes);

  return toProjectActionResult(await fetch(`/api/projects/${projectId}/art-assets`, {
    method: "POST",
    body: payload
  }));
}

export async function deleteProjectArtAsset(projectId: string, assetId: string) {
  return toProjectActionResult(await fetch(`/api/projects/${projectId}/art-assets/${assetId}`, {
    method: "DELETE"
  }));
}

export function createProjectMilestone(projectId: string, milestone: ProjectMilestoneDraft) {
  return projectJsonRequest(`/api/projects/${projectId}/milestones`, "POST", {
    title: milestone.title,
    description: milestone.description,
    ownerLabel: milestone.ownerLabel,
    status: milestone.status,
    dueAt: milestone.dueAt ? new Date(milestone.dueAt).toISOString() : undefined,
    budgetedCostCents: Number(milestone.budgetedCostCents || 0),
    expectedRevenueCents: Number(milestone.expectedRevenueCents || 0)
  });
}

export function saveProjectMilestone(projectId: string, milestoneId: string, milestone: ProjectMilestoneDraft) {
  return projectJsonRequest(`/api/projects/${projectId}/milestones/${milestoneId}`, "PATCH", {
    title: milestone.title,
    description: milestone.description,
    ownerLabel: milestone.ownerLabel,
    status: milestone.status,
    dueAt: milestone.dueAt ? new Date(milestone.dueAt).toISOString() : undefined,
    budgetedCostCents: Number(milestone.budgetedCostCents || 0),
    expectedRevenueCents: Number(milestone.expectedRevenueCents || 0)
  });
}

export function createProjectKanbanColumn(projectId: string, name: string, color: string) {
  return projectJsonRequest(`/api/projects/${projectId}/kanban`, "PATCH", {
    type: "createColumn",
    name,
    color
  });
}

export function updateProjectKanbanColumn(projectId: string, columnId: string, name: string, color: string | null, sortOrder: number) {
  return projectJsonRequest(`/api/projects/${projectId}/kanban`, "PATCH", {
    type: "updateColumn",
    columnId,
    name,
    color,
    sortOrder
  });
}

export function createProjectKanbanCard(projectId: string, columnId: string, card: ProjectKanbanCardDraft) {
  return projectJsonRequest(`/api/projects/${projectId}/kanban`, "PATCH", {
    type: "createCard",
    columnId,
    title: card.title,
    description: card.description,
    assigneeLabel: card.assigneeLabel,
    dueDate: card.dueDate ? new Date(card.dueDate).toISOString() : undefined,
    labels: parseLabels(card.labels)
  });
}

export function saveProjectKanbanCard(projectId: string, cardId: string, card: ProjectKanbanCardDraft & { columnId: string }) {
  return projectJsonRequest(`/api/projects/${projectId}/kanban`, "PATCH", {
    type: "updateCard",
    cardId,
    title: card.title,
    columnId: card.columnId,
    description: card.description,
    assigneeLabel: card.assigneeLabel,
    dueDate: card.dueDate ? new Date(card.dueDate).toISOString() : null,
    labels: parseLabels(card.labels)
  });
}

export function moveProjectKanbanCard(projectId: string, cardId: string, columnId: string) {
  return projectJsonRequest(`/api/projects/${projectId}/kanban`, "PATCH", {
    type: "updateCard",
    cardId,
    columnId
  });
}

export function moveProjectKanbanCardInColumn(projectId: string, cardId: string, direction: "up" | "down") {
  return projectJsonRequest(`/api/projects/${projectId}/kanban`, "PATCH", {
    type: "moveCard",
    cardId,
    direction
  });
}

export function reorderProjectKanbanCard(projectId: string, cardId: string, columnId: string, targetIndex: number) {
  return projectJsonRequest(`/api/projects/${projectId}/kanban`, "PATCH", {
    type: "reorderCard",
    cardId,
    columnId,
    targetIndex
  });
}

export function deleteProjectKanbanCard(projectId: string, cardId: string) {
  return projectJsonRequest(`/api/projects/${projectId}/kanban`, "PATCH", {
    type: "deleteCard",
    cardId
  });
}

export function moveProjectKanbanColumn(projectId: string, columnId: string, direction: "left" | "right") {
  return projectJsonRequest(`/api/projects/${projectId}/kanban`, "PATCH", {
    type: "moveColumn",
    columnId,
    direction
  });
}

export function deleteProjectKanbanColumn(projectId: string, columnId: string) {
  return projectJsonRequest(`/api/projects/${projectId}/kanban`, "PATCH", {
    type: "deleteColumn",
    columnId
  });
}

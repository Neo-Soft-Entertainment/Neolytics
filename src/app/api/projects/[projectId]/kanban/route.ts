import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import {
  createKanbanCard,
  createKanbanColumn,
  createKanbanView,
  deleteKanbanCard,
  deleteKanbanColumn,
  deleteKanbanView,
  moveKanbanCard,
  moveKanbanColumn,
  reorderKanbanCard,
  updateKanbanCard,
  updateKanbanColumn,
  updateKanbanView
} from "@/lib/project-service";
import { parseJsonBody } from "@/lib/request";
import { invalidateServerCache } from "@/lib/server-memory-cache";

const schema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("createColumn"),
    name: z.string().min(2),
    color: z.string().optional()
  }),
  z.object({
    type: z.literal("updateColumn"),
    columnId: z.string().min(1),
    name: z.string().optional(),
    color: z.string().nullable().optional(),
    sortOrder: z.coerce.number().int().nonnegative().optional()
  }),
  z.object({
    type: z.literal("moveColumn"),
    columnId: z.string().min(1),
    direction: z.enum(["left", "right"])
  }),
  z.object({
    type: z.literal("deleteColumn"),
    columnId: z.string().min(1)
  }),
  z.object({
    type: z.literal("createView"),
    name: z.string().min(2),
    layout: z.enum(["table", "board", "list"]),
    groupBy: z.string().min(2),
    sortBy: z.string().min(2),
    sortDirection: z.enum(["asc", "desc"]),
    visibleProperties: z.array(z.string()).optional()
  }),
  z.object({
    type: z.literal("updateView"),
    viewId: z.string().min(1),
    name: z.string().min(2).optional(),
    layout: z.enum(["table", "board", "list"]).optional(),
    groupBy: z.string().min(2).optional(),
    sortBy: z.string().min(2).optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    visibleProperties: z.array(z.string()).optional()
  }),
  z.object({
    type: z.literal("deleteView"),
    viewId: z.string().min(1)
  }),
  z.object({
    type: z.literal("createCard"),
    columnId: z.string().min(1),
    title: z.string().min(2),
    description: z.string().optional(),
    assigneeLabel: z.string().optional(),
    dueDate: z.string().datetime().optional(),
    labels: z.array(z.string()).optional()
  }),
  z.object({
    type: z.literal("updateCard"),
    cardId: z.string().min(1),
    columnId: z.string().optional(),
    title: z.string().optional(),
    description: z.string().nullable().optional(),
    assigneeLabel: z.string().nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
    sortOrder: z.coerce.number().int().nonnegative().optional(),
    labels: z.array(z.string()).optional()
  }),
  z.object({
    type: z.literal("moveCard"),
    cardId: z.string().min(1),
    direction: z.enum(["up", "down"])
  }),
  z.object({
    type: z.literal("reorderCard"),
    cardId: z.string().min(1),
    columnId: z.string().min(1),
    targetIndex: z.coerce.number().int().nonnegative()
  }),
  z.object({
    type: z.literal("deleteCard"),
    cardId: z.string().min(1)
  })
]);

function invalidateProjectReadCaches(workspaceId: string, projectId: string) {
  invalidateServerCache(`projects:list:${workspaceId}`);
  invalidateServerCache(`projects:detail:${workspaceId}:${projectId}`);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Visualizadores não podem editar o quadro kanban.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const { projectId } = await params;

    if (body.type === "createColumn") {
      const project = await createKanbanColumn({
        projectId,
        workspaceId: context.workspace.id,
        name: body.name,
        color: body.color
      });

      invalidateProjectReadCaches(context.workspace.id, projectId);
      return ok(project);
    }

    if (body.type === "updateColumn") {
      const project = await updateKanbanColumn({
        projectId,
        workspaceId: context.workspace.id,
        columnId: body.columnId,
        name: body.name,
        color: body.color,
        sortOrder: body.sortOrder
      });

      invalidateProjectReadCaches(context.workspace.id, projectId);
      return ok(project);
    }

    if (body.type === "createCard") {
      let dueDate: Date | null = null;

      if (body.dueDate) {
        dueDate = new Date(body.dueDate);
      }

      const project = await createKanbanCard({
        projectId,
        workspaceId: context.workspace.id,
        columnId: body.columnId,
        title: body.title,
        description: body.description,
        assigneeLabel: body.assigneeLabel,
        dueDate,
        labels: body.labels
      });

      invalidateProjectReadCaches(context.workspace.id, projectId);
      return ok(project);
    }

    if (body.type === "moveColumn") {
      const project = await moveKanbanColumn({
        projectId,
        workspaceId: context.workspace.id,
        columnId: body.columnId,
        direction: body.direction
      });

      invalidateProjectReadCaches(context.workspace.id, projectId);
      return ok(project);
    }

    if (body.type === "deleteColumn") {
      const project = await deleteKanbanColumn({
        projectId,
        workspaceId: context.workspace.id,
        columnId: body.columnId
      });

      invalidateProjectReadCaches(context.workspace.id, projectId);
      return ok(project);
    }

    if (body.type === "createView") {
      const project = await createKanbanView({
        projectId,
        workspaceId: context.workspace.id,
        name: body.name,
        layout: body.layout,
        groupBy: body.groupBy,
        sortBy: body.sortBy,
        sortDirection: body.sortDirection,
        visibleProperties: body.visibleProperties
      });

      invalidateProjectReadCaches(context.workspace.id, projectId);
      return ok(project);
    }

    if (body.type === "updateView") {
      const project = await updateKanbanView({
        projectId,
        workspaceId: context.workspace.id,
        viewId: body.viewId,
        name: body.name,
        layout: body.layout,
        groupBy: body.groupBy,
        sortBy: body.sortBy,
        sortDirection: body.sortDirection,
        visibleProperties: body.visibleProperties
      });

      invalidateProjectReadCaches(context.workspace.id, projectId);
      return ok(project);
    }

    if (body.type === "deleteView") {
      const project = await deleteKanbanView({
        projectId,
        workspaceId: context.workspace.id,
        viewId: body.viewId
      });

      invalidateProjectReadCaches(context.workspace.id, projectId);
      return ok(project);
    }

    if (body.type === "moveCard") {
      const project = await moveKanbanCard({
        projectId,
        workspaceId: context.workspace.id,
        cardId: body.cardId,
        direction: body.direction
      });

      invalidateProjectReadCaches(context.workspace.id, projectId);
      return ok(project);
    }

    if (body.type === "deleteCard") {
      const project = await deleteKanbanCard({
        projectId,
        workspaceId: context.workspace.id,
        cardId: body.cardId
      });

      invalidateProjectReadCaches(context.workspace.id, projectId);
      return ok(project);
    }

    if (body.type === "reorderCard") {
      await reorderKanbanCard({
        projectId,
        workspaceId: context.workspace.id,
        cardId: body.cardId,
        columnId: body.columnId,
        targetIndex: body.targetIndex
      });

      invalidateProjectReadCaches(context.workspace.id, projectId);
      return ok({ updated: true });
    }

    let dueDate: Date | null = null;

    if (body.dueDate) {
      dueDate = new Date(body.dueDate);
    }

    const project = await updateKanbanCard({
      projectId,
      workspaceId: context.workspace.id,
      cardId: body.cardId,
      columnId: body.columnId,
      title: body.title,
      description: body.description,
      assigneeLabel: body.assigneeLabel,
      dueDate,
      sortOrder: body.sortOrder,
      labels: body.labels
    });

    invalidateProjectReadCaches(context.workspace.id, projectId);
    return ok(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid kanban payload.");
    }

    return serverError("Não foi possível atualizar o kanban.");
  }
}

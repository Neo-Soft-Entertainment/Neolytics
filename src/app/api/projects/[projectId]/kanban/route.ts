import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import {
  createKanbanCard,
  createKanbanColumn,
  deleteKanbanCard,
  deleteKanbanColumn,
  moveKanbanCard,
  moveKanbanColumn,
  reorderKanbanCard,
  updateKanbanCard,
  updateKanbanColumn
} from "@/lib/project-service";
import { parseJsonBody } from "@/lib/request";

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
      return ok(await createKanbanColumn({
        projectId,
        workspaceId: context.workspace.id,
        name: body.name,
        color: body.color
      }));
    }

    if (body.type === "updateColumn") {
      return ok(await updateKanbanColumn({
        projectId,
        workspaceId: context.workspace.id,
        columnId: body.columnId,
        name: body.name,
        color: body.color,
        sortOrder: body.sortOrder
      }));
    }

    if (body.type === "createCard") {
      return ok(await createKanbanCard({
        projectId,
        workspaceId: context.workspace.id,
        columnId: body.columnId,
        title: body.title,
        description: body.description,
        assigneeLabel: body.assigneeLabel,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        labels: body.labels
      }));
    }

    if (body.type === "moveColumn") {
      return ok(await moveKanbanColumn({
        projectId,
        workspaceId: context.workspace.id,
        columnId: body.columnId,
        direction: body.direction
      }));
    }

    if (body.type === "deleteColumn") {
      return ok(await deleteKanbanColumn({
        projectId,
        workspaceId: context.workspace.id,
        columnId: body.columnId
      }));
    }

    if (body.type === "moveCard") {
      return ok(await moveKanbanCard({
        projectId,
        workspaceId: context.workspace.id,
        cardId: body.cardId,
        direction: body.direction
      }));
    }

    if (body.type === "deleteCard") {
      return ok(await deleteKanbanCard({
        projectId,
        workspaceId: context.workspace.id,
        cardId: body.cardId
      }));
    }

    if (body.type === "reorderCard") {
      return ok(await reorderKanbanCard({
        projectId,
        workspaceId: context.workspace.id,
        cardId: body.cardId,
        columnId: body.columnId,
        targetIndex: body.targetIndex
      }));
    }

    return ok(await updateKanbanCard({
      projectId,
      workspaceId: context.workspace.id,
      cardId: body.cardId,
      columnId: body.columnId,
      title: body.title,
      description: body.description,
      assigneeLabel: body.assigneeLabel,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      sortOrder: body.sortOrder,
      labels: body.labels
    }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid kanban payload.");
    }

    return serverError("Não foi possível atualizar o kanban.");
  }
}

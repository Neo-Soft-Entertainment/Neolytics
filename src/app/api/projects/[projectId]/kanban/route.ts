import { z } from "zod";

import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import {
  createKanbanCard,
  createKanbanColumn,
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

    return serverError("Unable to update kanban.");
  }
}

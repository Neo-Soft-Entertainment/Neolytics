import { ProjectMilestoneStatus } from "@prisma/client";
import { z } from "zod";

import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { updateProjectMilestone } from "@/lib/finance-service";
import { getProjectById } from "@/lib/project-service";
import { parseJsonBody } from "@/lib/request";
import { getErrorMessage } from "@/lib/error-message";
import { invalidateServerCache } from "@/lib/server-memory-cache";

const optionalDate = z.preprocess((value: any) => {
  if (!value) {
    return undefined;
  }

  return new Date(String(value));
}, z.date().optional());

const schema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  ownerLabel: z.string().optional(),
  status: z.nativeEnum(ProjectMilestoneStatus),
  dueAt: optionalDate,
  completedAt: optionalDate,
  budgetedCostCents: z.coerce.number().int().nonnegative().optional(),
  expectedRevenueCents: z.coerce.number().int().nonnegative().optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    const body = await parseJsonBody(request, schema);
    const { milestoneId, projectId } = await params;
    await updateProjectMilestone({
      projectId,
      workspaceId: context.workspace.id,
      milestoneId,
      title: body.title,
      description: body.description,
      ownerLabel: body.ownerLabel,
      status: body.status,
      dueAt: body.dueAt,
      completedAt: body.completedAt,
      budgetedCostCents: body.budgetedCostCents,
      expectedRevenueCents: body.expectedRevenueCents
    });

    const project = await getProjectById(projectId, context.workspace.id);
    invalidateServerCache(`projects:list:${context.workspace.id}`);
    invalidateServerCache(`projects:detail:${context.workspace.id}:${projectId}`);
    return ok(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Dados do marco inválidos.");
    }

    return serverError(getErrorMessage(error, "Não foi possível atualizar o marco."));
  }
}

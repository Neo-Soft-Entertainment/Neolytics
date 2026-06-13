import { ProjectStage } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { getProjectById, updateProject } from "@/lib/project-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  name: z.string().min(2).optional(),
  elevatorPitch: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  genreInput: z.string().nullable().optional(),
  tagInput: z.string().nullable().optional(),
  targetAudience: z.string().nullable().optional(),
  coreLoop: z.string().nullable().optional(),
  differentiator: z.string().nullable().optional(),
  monetizationModel: z.string().nullable().optional(),
  artDirection: z.string().nullable().optional(),
  playerFantasy: z.string().nullable().optional(),
  pricePointCents: z.coerce.number().int().nonnegative().nullable().optional(),
  stage: z.nativeEnum(ProjectStage).optional()
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  void request;
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  const { projectId } = await params;
  const project = await getProjectById(projectId, context.workspace.id);

  if (!project) {
    return notFound("Project not found.");
  }

  return ok(project);
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
    return forbidden("Viewers cannot edit projects.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const { projectId } = await params;
    const project = await updateProject({
      projectId,
      workspaceId: context.workspace.id,
      ...body
    });

    return ok(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid project update payload.");
    }

    return serverError("Unable to update project.");
  }
}

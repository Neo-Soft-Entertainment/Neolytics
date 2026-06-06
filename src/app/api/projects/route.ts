import { ProjectStage } from "@prisma/client";
import { z } from "zod";

import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { createProject, listProjects } from "@/lib/project-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  name: z.string().min(2),
  elevatorPitch: z.string().optional(),
  description: z.string().optional(),
  genreInput: z.string().optional(),
  tagInput: z.string().optional(),
  targetAudience: z.string().optional(),
  coreLoop: z.string().optional(),
  differentiator: z.string().optional(),
  monetizationModel: z.string().optional(),
  artDirection: z.string().optional(),
  playerFantasy: z.string().optional(),
  pricePointCents: z.coerce.number().int().nonnegative().nullable().optional(),
  stage: z.nativeEnum(ProjectStage).optional()
});

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  return ok(await listProjects(context.workspace.id));
}

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    const body = await parseJsonBody(request, schema);
    const project = await createProject({
      organizationId: context.organizationId,
      workspaceId: context.workspace.id,
      createdById: context.userId,
      ...body,
      stage: body.stage
    });

    return ok(project, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid project payload.");
    }

    return serverError("Unable to create project.");
  }
}

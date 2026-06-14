import { ProjectStage } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { EntitlementError, entitlementErrorResponse } from "@/lib/entitlements";
import { createProject, listProjects } from "@/lib/project-service";
import { parseJsonBody } from "@/lib/request";
import { SubscriptionLimitError } from "@/lib/subscription-service";

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

  if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Visualizadores não podem criar projetos.");
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

    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    if (error instanceof EntitlementError) {
      return entitlementErrorResponse(error);
    }

    return serverError("Não foi possível criar o projeto.");
  }
}

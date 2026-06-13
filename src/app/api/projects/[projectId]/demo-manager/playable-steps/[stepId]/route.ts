import { z } from "zod";

import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { deletePlayableStep, updatePlayableStep } from "@/lib/demo-manager-service";
import { parseJsonBody } from "@/lib/request";
import { playableStepUpdateSchema } from "@/lib/demo-manager-schemas";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; stepId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Viewers cannot edit playable steps.");
  }

  try {
    const body = await parseJsonBody(request, playableStepUpdateSchema);
    const { projectId, stepId } = await params;
    const step = await updatePlayableStep(context.workspace.id, projectId, stepId, body);

    if (!step) {
      return notFound("Playable step not found.");
    }

    return ok(step);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid playable step payload.");
    }

    return serverError("Unable to update playable step.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; stepId: string }> }
) {
  void request;
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Viewers cannot delete playable steps.");
  }

  const { projectId, stepId } = await params;
  const deleted = await deletePlayableStep(context.workspace.id, projectId, stepId);

  if (!deleted) {
    return notFound("Playable step not found.");
  }

  return ok(deleted);
}

import { z } from "zod";

import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { deleteEmotionalBeat, updateEmotionalBeat } from "@/lib/demo-manager-service";
import { emotionalBeatUpdateSchema } from "@/lib/demo-manager-schemas";
import { parseJsonBody } from "@/lib/request";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; beatId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole)) {
    return forbidden("Viewers cannot edit emotional beats.");
  }

  try {
    const body = await parseJsonBody(request, emotionalBeatUpdateSchema);
    const { projectId, beatId } = await params;
    const beat = await updateEmotionalBeat(context.workspace.id, projectId, beatId, body);

    if (!beat) {
      return notFound("Emotional beat not found.");
    }

    return ok(beat);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid emotional beat payload.");
    }

    return serverError("Unable to update emotional beat.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; beatId: string }> }
) {
  void request;
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole)) {
    return forbidden("Viewers cannot delete emotional beats.");
  }

  const { projectId, beatId } = await params;
  const deleted = await deleteEmotionalBeat(context.workspace.id, projectId, beatId);

  if (!deleted) {
    return notFound("Emotional beat not found.");
  }

  return ok(deleted);
}

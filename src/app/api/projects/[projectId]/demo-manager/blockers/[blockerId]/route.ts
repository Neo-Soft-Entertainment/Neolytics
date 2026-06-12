import { z } from "zod";

import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { deleteBlocker, updateBlocker } from "@/lib/demo-manager-service";
import { blockerUpdateSchema } from "@/lib/demo-manager-schemas";
import { parseJsonBody } from "@/lib/request";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; blockerId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole)) {
    return forbidden("Viewers cannot edit blockers.");
  }

  try {
    const body = await parseJsonBody(request, blockerUpdateSchema);
    const { projectId, blockerId } = await params;
    const blocker = await updateBlocker(context.workspace.id, projectId, blockerId, body);

    if (!blocker) {
      return notFound("Blocker not found.");
    }

    return ok(blocker);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid blocker payload.");
    }

    return serverError("Unable to update blocker.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; blockerId: string }> }
) {
  void request;
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole)) {
    return forbidden("Viewers cannot delete blockers.");
  }

  const { projectId, blockerId } = await params;
  const deleted = await deleteBlocker(context.workspace.id, projectId, blockerId);

  if (!deleted) {
    return notFound("Blocker not found.");
  }

  return ok(deleted);
}

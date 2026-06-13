import { z } from "zod";

import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { deleteBug, updateBug } from "@/lib/demo-manager-service";
import { bugUpdateSchema } from "@/lib/demo-manager-schemas";
import { parseJsonBody } from "@/lib/request";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; bugId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Viewers cannot edit bugs.");
  }

  try {
    const body = await parseJsonBody(request, bugUpdateSchema);
    const { projectId, bugId } = await params;
    const bug = await updateBug(context.workspace.id, projectId, bugId, body);

    if (!bug) {
      return notFound("Bug not found.");
    }

    return ok(bug);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid bug payload.");
    }

    return serverError("Unable to update bug.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; bugId: string }> }
) {
  void request;
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Viewers cannot delete bugs.");
  }

  const { projectId, bugId } = await params;
  const deleted = await deleteBug(context.workspace.id, projectId, bugId);

  if (!deleted) {
    return notFound("Bug not found.");
  }

  return ok(deleted);
}

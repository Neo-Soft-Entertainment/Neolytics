import { z } from "zod";

import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { deleteDemoElement, updateDemoElement } from "@/lib/demo-manager-service";
import { demoElementUpdateSchema } from "@/lib/demo-manager-schemas";
import { parseJsonBody } from "@/lib/request";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; elementId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole)) {
    return forbidden("Viewers cannot edit Demo Manager items.");
  }

  try {
    const body = await parseJsonBody(request, demoElementUpdateSchema);
    const { projectId, elementId } = await params;
    const element = await updateDemoElement(context.workspace.id, projectId, elementId, body);

    if (!element) {
      return notFound("Demo Manager item not found.");
    }

    return ok(element);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid Demo Manager item payload.");
    }

    return serverError("Unable to update Demo Manager item.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; elementId: string }> }
) {
  void request;
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole)) {
    return forbidden("Viewers cannot delete Demo Manager items.");
  }

  const { projectId, elementId } = await params;
  const deleted = await deleteDemoElement(context.workspace.id, projectId, elementId);

  if (!deleted) {
    return notFound("Demo Manager item not found.");
  }

  return ok(deleted);
}

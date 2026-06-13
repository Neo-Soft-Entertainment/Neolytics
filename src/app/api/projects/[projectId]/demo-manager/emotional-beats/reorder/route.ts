import { z } from "zod";

import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { reorderEmotionalBeats } from "@/lib/demo-manager-service";
import { reorderSchema } from "@/lib/demo-manager-schemas";
import { parseJsonBody } from "@/lib/request";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Viewers cannot reorder emotional beats.");
  }

  try {
    const body = await parseJsonBody(request, reorderSchema);
    const { projectId } = await params;
    const result = await reorderEmotionalBeats(context.workspace.id, projectId, body.orderedIds);

    if (!result) {
      return notFound("Emotional beats not found.");
    }

    return ok(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid reorder payload.");
    }

    return serverError("Unable to reorder emotional beats.");
  }
}

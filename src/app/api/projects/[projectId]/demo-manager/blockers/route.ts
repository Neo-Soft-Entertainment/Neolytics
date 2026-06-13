import { z } from "zod";

import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { createBlocker } from "@/lib/demo-manager-service";
import { blockerSchema } from "@/lib/demo-manager-schemas";
import { parseJsonBody } from "@/lib/request";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Viewers cannot create blockers.");
  }

  try {
    const body = await parseJsonBody(request, blockerSchema);
    const { projectId } = await params;
    const blocker = await createBlocker(context.workspace.id, projectId, body);

    if (!blocker) {
      return notFound("Project not found.");
    }

    return ok(blocker, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid blocker payload.");
    }

    return serverError("Unable to create blocker.");
  }
}

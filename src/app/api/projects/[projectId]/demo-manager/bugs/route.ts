import { z } from "zod";

import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { createBug } from "@/lib/demo-manager-service";
import { bugSchema } from "@/lib/demo-manager-schemas";
import { parseJsonBody } from "@/lib/request";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole)) {
    return forbidden("Viewers cannot create bugs.");
  }

  try {
    const body = await parseJsonBody(request, bugSchema);
    const { projectId } = await params;
    const bug = await createBug(context.workspace.id, projectId, body);

    if (!bug) {
      return notFound("Project not found.");
    }

    return ok(bug, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid bug payload.");
    }

    return serverError("Unable to create bug.");
  }
}

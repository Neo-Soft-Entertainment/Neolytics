import { z } from "zod";

import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { createPlayableStep } from "@/lib/demo-manager-service";
import { parseJsonBody } from "@/lib/request";
import { playableStepSchema } from "@/lib/demo-manager-schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole)) {
    return forbidden("Viewers cannot create playable steps.");
  }

  try {
    const body = await parseJsonBody(request, playableStepSchema);
    const { projectId } = await params;
    const step = await createPlayableStep(context.workspace.id, projectId, body);

    if (!step) {
      return notFound("Project not found.");
    }

    return ok(step, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid playable step payload.");
    }

    return serverError("Unable to create playable step.");
  }
}

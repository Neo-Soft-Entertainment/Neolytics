import { z } from "zod";

import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { createEmotionalBeat } from "@/lib/demo-manager-service";
import { emotionalBeatSchema } from "@/lib/demo-manager-schemas";
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
    return forbidden("Viewers cannot create emotional beats.");
  }

  try {
    const body = await parseJsonBody(request, emotionalBeatSchema);
    const { projectId } = await params;
    const beat = await createEmotionalBeat(context.workspace.id, projectId, body);

    if (!beat) {
      return notFound("Project not found.");
    }

    return ok(beat, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid emotional beat payload.");
    }

    return serverError("Unable to create emotional beat.");
  }
}

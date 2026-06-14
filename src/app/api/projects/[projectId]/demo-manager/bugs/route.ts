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

  if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Visualizadores não podem criar bugs.");
  }

  try {
    const body = await parseJsonBody(request, bugSchema);
    const { projectId } = await params;
    const bug = await createBug(context.workspace.id, projectId, body);

    if (!bug) {
      return notFound("Projeto não encontrado.");
    }

    return ok(bug, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid bug payload.");
    }

    return serverError("Não foi possível criar o bug.");
  }
}

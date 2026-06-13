import { z } from "zod";

import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { createDependency } from "@/lib/demo-manager-service";
import { dependencySchema } from "@/lib/demo-manager-schemas";
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
    return forbidden("Viewers cannot create dependencies.");
  }

  try {
    const body = await parseJsonBody(request, dependencySchema);
    const { projectId } = await params;
    const dependency = await createDependency(context.workspace.id, projectId, body);

    if (!dependency) {
      return notFound("Project not found.");
    }

    return ok(dependency, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid dependency payload.");
    }

    return serverError("Unable to create dependency.");
  }
}

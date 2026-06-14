import { z } from "zod";

import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { deleteDependency, updateDependency } from "@/lib/demo-manager-service";
import { dependencyUpdateSchema } from "@/lib/demo-manager-schemas";
import { parseJsonBody } from "@/lib/request";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; dependencyId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Visualizadores não podem editar dependências.");
  }

  try {
    const body = await parseJsonBody(request, dependencyUpdateSchema);
    const { projectId, dependencyId } = await params;
    const dependency = await updateDependency(context.workspace.id, projectId, dependencyId, body);

    if (!dependency) {
      return notFound("Dependency not found.");
    }

    return ok(dependency);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid dependency payload.");
    }

    return serverError("Não foi possível atualizar a dependência.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; dependencyId: string }> }
) {
  void request;
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Visualizadores não podem excluir dependências.");
  }

  const { projectId, dependencyId } = await params;
  const deleted = await deleteDependency(context.workspace.id, projectId, dependencyId);

  if (!deleted) {
    return notFound("Dependency not found.");
  }

  return ok(deleted);
}

import { forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { deleteProjectArtAsset } from "@/lib/project-service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; assetId: string }> }
) {
  void request;
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Visualizadores não podem excluir assets de arte.");
  }

  try {
    const { projectId, assetId } = await params;
    const result = await deleteProjectArtAsset({
      projectId,
      assetId,
      workspaceId: context.workspace.id
    });

    return ok(result);
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Não foi possível excluir o asset de arte.");
  }
}

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

  if (!canWriteOrganization(context.organizationRole)) {
    return forbidden("Viewers cannot delete art assets.");
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
    return serverError(error instanceof Error ? error.message : "Unable to delete art asset.");
  }
}

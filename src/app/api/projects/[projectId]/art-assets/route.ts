import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { EntitlementError, entitlementErrorResponse } from "@/lib/entitlements";
import { uploadProjectArtAsset } from "@/lib/project-service";
import { getErrorMessage } from "@/lib/error-message";
import { invalidateServerCache } from "@/lib/server-memory-cache";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Visualizadores não podem enviar assets de arte.");
  }

  try {
    const { projectId } = await params;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return badRequest("Art asset image is required.");
    }

    const asset = await uploadProjectArtAsset({
      projectId,
      workspaceId: context.workspace.id,
      userId: context.userId,
      file,
      kind: String(formData.get("kind") ?? "reference"),
      notes: String(formData.get("notes") ?? "")
    });

    invalidateServerCache(`projects:list:${context.workspace.id}`);
    invalidateServerCache(`projects:detail:${context.workspace.id}:${projectId}`);
    return ok(asset, { status: 201 });
  } catch (error) {
    if (error instanceof EntitlementError) {
      return entitlementErrorResponse(error);
    }

    return serverError(getErrorMessage(error, "Não foi possível enviar o asset de arte."));
  }
}

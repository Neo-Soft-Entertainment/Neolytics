import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { EntitlementError, entitlementErrorResponse } from "@/lib/entitlements";
import { uploadProjectArtAsset } from "@/lib/project-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole)) {
    return forbidden("Viewers cannot upload art assets.");
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

    return ok(asset, { status: 201 });
  } catch (error) {
    if (error instanceof EntitlementError) {
      return entitlementErrorResponse(error);
    }

    return serverError(error instanceof Error ? error.message : "Unable to upload art asset.");
  }
}

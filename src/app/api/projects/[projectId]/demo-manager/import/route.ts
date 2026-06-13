import { forbidden, notFound, ok, serverError, unauthorized, badRequest } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { importDemoManager } from "@/lib/demo-manager-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Viewers cannot import Demo Manager data.");
  }

  try {
    const body = await request.json();
    const { projectId } = await params;
    const data = await importDemoManager(context.workspace.id, projectId, body);

    if (!data) {
      return notFound("Project not found.");
    }

    return ok(data);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof Error) {
      return badRequest(error.message || "Invalid Demo Manager JSON.");
    }

    return serverError("Unable to import Demo Manager data.");
  }
}

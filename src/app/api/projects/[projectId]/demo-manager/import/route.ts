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
    return forbidden("Visualizadores não podem importar dados do Demo Manager.");
  }

  try {
    const body = await request.json();
    const { projectId } = await params;
    const data = await importDemoManager(context.workspace.id, projectId, body);

    if (!data) {
      return notFound("Projeto não encontrado.");
    }

    return ok(data);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof Error) {
      return badRequest(error.message || "Invalid Demo Manager JSON.");
    }

    return serverError("Não foi possível importar os dados do Demo Manager.");
  }
}

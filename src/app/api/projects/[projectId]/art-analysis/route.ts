import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { EntitlementError, entitlementErrorResponse } from "@/lib/entitlements";
import { analyzeProjectArt } from "@/lib/project-service";
import { SubscriptionLimitError } from "@/lib/subscription-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  void request;
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Visualizadores não podem rodar análises de arte.");
  }

  try {
    const { projectId } = await params;
    const project = await analyzeProjectArt(projectId, context.workspace.id, context.userId);

    if (!project) {
      return notFound("Projeto não encontrado.");
    }

    return ok(project);
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    if (error instanceof EntitlementError) {
      return entitlementErrorResponse(error);
    }

    return serverError("Não foi possível analisar a direção de arte.");
  }
}

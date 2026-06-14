import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { EntitlementError, entitlementErrorResponse } from "@/lib/entitlements";
import { analyzeProject } from "@/lib/project-service";
import { invalidateServerCache } from "@/lib/server-memory-cache";
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
    return forbidden("Visualizadores não podem rodar análises de projeto.");
  }

  try {
    const { projectId } = await params;
    const project = await analyzeProject(projectId, context.workspace.id, context.userId);

    if (!project) {
      return notFound("Projeto não encontrado.");
    }

    invalidateServerCache(`projects:list:${context.workspace.id}`);
    invalidateServerCache(`projects:detail:${context.workspace.id}:${projectId}`);
    return ok(project);
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    if (error instanceof EntitlementError) {
      return entitlementErrorResponse(error);
    }

    return serverError("Não foi possível analisar o projeto.");
  }
}

import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { EntitlementError, entitlementErrorResponse } from "@/lib/entitlements";
import { analyzeProject } from "@/lib/project-service";
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

  if (!canWriteOrganization(context.organizationRole)) {
    return forbidden("Viewers cannot run project analyses.");
  }

  try {
    const { projectId } = await params;
    const project = await analyzeProject(projectId, context.workspace.id, context.userId);

    if (!project) {
      return notFound("Project not found.");
    }

    return ok(project);
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    if (error instanceof EntitlementError) {
      return entitlementErrorResponse(error);
    }

    return serverError("Unable to analyze project.");
  }
}

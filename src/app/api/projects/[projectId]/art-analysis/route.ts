import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
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

  if (!canWriteOrganization(context.organizationRole)) {
    return forbidden("Viewers cannot run art analyses.");
  }

  try {
    const { projectId } = await params;
    const project = await analyzeProjectArt(projectId, context.workspace.id);

    if (!project) {
      return notFound("Project not found.");
    }

    return ok(project);
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    return serverError("Unable to analyze art direction.");
  }
}

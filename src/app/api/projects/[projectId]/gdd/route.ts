import { badRequest, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { generateProjectGdd } from "@/lib/project-service";
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

  try {
    const { projectId } = await params;
    const project = await generateProjectGdd(projectId, context.workspace.id);

    if (!project) {
      return notFound("Project not found.");
    }

    return ok(project);
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    return serverError("Unable to generate GDD.");
  }
}

import { notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { analyzeProject } from "@/lib/project-service";

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
    const project = await analyzeProject(projectId, context.workspace.id);

    if (!project) {
      return notFound("Project not found.");
    }

    return ok(project);
  } catch (error) {
    return serverError("Unable to analyze project.");
  }
}

import { createGoogleSheetsPublishResponse, createWorkbookDownloadResponse } from "@/lib/export-route";
import { unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { buildProjectWorkbook } from "@/lib/export-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  const { projectId } = await params;
  return createWorkbookDownloadResponse(request, () => buildProjectWorkbook(projectId, context.workspace.id));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  void request;
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  const { projectId } = await params;
  return createGoogleSheetsPublishResponse(
    () => buildProjectWorkbook(projectId, context.workspace.id),
    context.session.user.email
  );
}

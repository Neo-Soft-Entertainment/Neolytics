import { createWorkbookDownloadResponse, createGoogleSheetsPublishResponse } from "@/lib/export-route";
import { getApiContext } from "@/lib/auth-helpers";
import { buildDashboardWorkbook } from "@/lib/export-service";
import { unauthorized } from "@/lib/api-response";

export async function GET(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  return createWorkbookDownloadResponse(request, () => buildDashboardWorkbook(context.workspace.id));
}

export async function POST() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  return createGoogleSheetsPublishResponse(
    () => buildDashboardWorkbook(context.workspace.id),
    context.session.user.email
  );
}

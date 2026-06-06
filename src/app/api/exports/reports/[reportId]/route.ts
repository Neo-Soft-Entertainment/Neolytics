import { createGoogleSheetsPublishResponse, createWorkbookDownloadResponse } from "@/lib/export-route";
import { unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { buildReportWorkbook } from "@/lib/export-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  const { reportId } = await params;
  return createWorkbookDownloadResponse(request, context.organizationId, () => buildReportWorkbook(reportId, context.organizationId));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  void request;
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  const { reportId } = await params;
  return createGoogleSheetsPublishResponse(
    context.organizationId,
    () => buildReportWorkbook(reportId, context.organizationId),
    context.session.user.email
  );
}

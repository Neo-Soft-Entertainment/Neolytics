import { createGoogleSheetsPublishResponse, createWorkbookDownloadResponse } from "@/lib/export-route";
import { unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { buildOpportunitiesWorkbook } from "@/lib/export-service";

export async function GET(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  return createWorkbookDownloadResponse(request, buildOpportunitiesWorkbook);
}

export async function POST() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  return createGoogleSheetsPublishResponse(buildOpportunitiesWorkbook, context.session.user.email);
}

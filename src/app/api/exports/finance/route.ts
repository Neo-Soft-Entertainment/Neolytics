import { createGoogleSheetsPublishResponse, createWorkbookDownloadResponse } from "@/lib/export-route";
import { unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { buildFinanceWorkbook } from "@/lib/export-service";

export async function GET(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  return createWorkbookDownloadResponse(
    request,
    context.organizationId,
    () => buildFinanceWorkbook(context.organizationId)
  );
}

export async function POST(request: Request) {
  void request;
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  return createGoogleSheetsPublishResponse(
    context.organizationId,
    () => buildFinanceWorkbook(context.organizationId),
    context.session.user.email
  );
}

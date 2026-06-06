import { createWorkbookDownloadResponse, createGoogleSheetsPublishResponse } from "@/lib/export-route";
import { unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { buildGameWorkbook } from "@/lib/export-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  const { appId } = await params;
  return createWorkbookDownloadResponse(request, context.organizationId, () => buildGameWorkbook(Number(appId)));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  void request;
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  const { appId } = await params;
  return createGoogleSheetsPublishResponse(
    context.organizationId,
    () => buildGameWorkbook(Number(appId)),
    context.session.user.email
  );
}

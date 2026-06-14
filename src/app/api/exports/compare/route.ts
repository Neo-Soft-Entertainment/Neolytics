import { badRequest, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { createGoogleSheetsPublishResponse, createWorkbookDownloadResponse } from "@/lib/export-route";
import { buildCompareWorkbook } from "@/lib/export-service";

function getAppIds(request: Request) {
  const url = new URL(request.url);

  return (url.searchParams.get("appIds") ?? "")
    .split(",")
    .map((value: any) => Number(value))
    .filter((value: any) => Number.isInteger(value) && value > 0);
}

export async function GET(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  const appIds = getAppIds(request);

  if (appIds.length < 2) {
    return badRequest("Provide at least two app ids.");
  }

  return createWorkbookDownloadResponse(request, context.organizationId, () => buildCompareWorkbook(appIds));
}

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  const appIds = getAppIds(request);

  if (appIds.length < 2) {
    return badRequest("Provide at least two app ids.");
  }

  return createGoogleSheetsPublishResponse(
    context.organizationId,
    () => buildCompareWorkbook(appIds),
    context.session.user.email
  );
}

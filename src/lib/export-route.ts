import { badRequest, ok, serverError } from "@/lib/api-response";
import {
  createDownloadResponse,
  ExportWorkbook,
  isGoogleSheetsConfigured,
  publishWorkbookToGoogleSheets
} from "@/lib/export-service";

export function getExportFormat(url: URL) {
  const format = url.searchParams.get("format") ?? "xlsx";

  if (format !== "xlsx" && format !== "csv") {
    return null;
  }

  return format;
}

export async function createWorkbookDownloadResponse(
  request: Request,
  buildWorkbook: () => Promise<ExportWorkbook>
) {
  try {
    const format = getExportFormat(new URL(request.url));

    if (!format) {
      return badRequest("Invalid export format.");
    }

    const workbook = await buildWorkbook();
    return createDownloadResponse(workbook, format);
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Unable to export workbook.");
  }
}

export async function createGoogleSheetsPublishResponse(
  buildWorkbook: () => Promise<ExportWorkbook>,
  userEmail?: string | null
) {
  if (!userEmail) {
    return badRequest("A valid user email is required for Google Sheets export.");
  }

  if (!isGoogleSheetsConfigured()) {
    return badRequest("Google Sheets integration is not configured in this environment yet.");
  }

  try {
    const workbook = await buildWorkbook();
    return ok(await publishWorkbookToGoogleSheets(workbook, userEmail));
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Unable to publish Google Sheets export.");
  }
}

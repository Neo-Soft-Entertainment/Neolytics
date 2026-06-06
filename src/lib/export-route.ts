import { badRequest, ok, serverError } from "@/lib/api-response";
import {
  createDownloadResponse,
  ExportWorkbook,
  isGoogleSheetsConfigured,
  publishWorkbookToGoogleSheets
} from "@/lib/export-service";
import {
  consumeSubscriptionUsage,
  enforceSubscriptionCapability,
  SubscriptionLimitError
} from "@/lib/subscription-service";

export function getExportFormat(url: URL) {
  const format = url.searchParams.get("format") ?? "xlsx";

  if (format !== "xlsx" && format !== "csv" && format !== "pdf") {
    return null;
  }

  return format;
}

export async function createWorkbookDownloadResponse(
  request: Request,
  organizationId: string,
  buildWorkbook: () => Promise<ExportWorkbook>
) {
  try {
    const format = getExportFormat(new URL(request.url));

    if (!format) {
      return badRequest("Invalid export format.");
    }

    if (format === "pdf") {
      await enforceSubscriptionCapability(organizationId, "pdfExport");
    }

    const workbook = await buildWorkbook();
    await consumeSubscriptionUsage(organizationId, "exportsGenerated");
    return await createDownloadResponse(workbook, format);
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    return serverError(error instanceof Error ? error.message : "Unable to export workbook.");
  }
}

export async function createGoogleSheetsPublishResponse(
  organizationId: string,
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
    const published = await publishWorkbookToGoogleSheets(workbook, userEmail);
    await consumeSubscriptionUsage(organizationId, "exportsGenerated");
    return ok(published);
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    return serverError(error instanceof Error ? error.message : "Unable to publish Google Sheets export.");
  }
}

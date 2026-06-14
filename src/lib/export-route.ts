import { PrivacyDecision } from "@prisma/client";

import { badRequest, ok, serverError } from "@/lib/api-response";
import {
  createDownloadResponse,
  ExportWorkbook,
  isGoogleSheetsConfigured,
  publishWorkbookToGoogleSheets
} from "@/lib/export-service";
import { db } from "@/lib/db";
import {
  consumeSubscriptionUsage,
  SubscriptionLimitError
} from "@/lib/subscription-service";
import { getApiContext } from "@/lib/auth-helpers";
import { canExportData } from "@/lib/authorization";
import { createPrivacyAuditLog } from "@/lib/privacy/audit";
import {
  EntitlementError,
  assertCanUseFeature,
  entitlementErrorResponse
} from "@/lib/entitlements";

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
    const context = await getApiContext();

    if (!format) {
      return badRequest("Invalid export format.");
    }

    if (context && !canExportData(context.organizationRole, context.organizationPermissions)) {
      return badRequest("Este cargo não pode exportar dados da organização.");
    }

    if (format === "pdf") {
      if (!context) {
        return badRequest("A valid session is required for PDF export.");
      }

      await assertCanUseFeature({
        userId: context.userId,
        workspaceId: context.workspace.id,
        organizationId
      }, "pdfExport");
    }

    const workbook = await buildWorkbook();
    await consumeSubscriptionUsage(organizationId, "exportsGenerated");
    await createPrivacyAuditLog(db, {
      organizationId,
      actorId: context?.userId ?? null,
      actorRole: context?.organizationRole ?? null,
      action: "export.downloaded",
      resourceType: "workbook_export",
      resourceId: format,
      decision: PrivacyDecision.ALLOW,
      reason: "Internal workbook export created.",
      metadata: {
        format
      }
    });
    return await createDownloadResponse(workbook, format);
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    if (error instanceof EntitlementError) {
      return entitlementErrorResponse(error);
    }

    return serverError(error instanceof Error ? error.message : "Não foi possível exportar a planilha.");
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
    const context = await getApiContext();

    if (context && !canExportData(context.organizationRole, context.organizationPermissions)) {
      return badRequest("Este cargo não pode exportar dados da organização.");
    }

    const workbook = await buildWorkbook();
    const published = await publishWorkbookToGoogleSheets(workbook, userEmail);
    await consumeSubscriptionUsage(organizationId, "exportsGenerated");
    await createPrivacyAuditLog(db, {
      organizationId,
      actorId: context?.userId ?? null,
      actorRole: context?.organizationRole ?? null,
      action: "export.published_google_sheets",
      resourceType: "workbook_export",
      resourceId: published.spreadsheetId,
      decision: PrivacyDecision.ALLOW,
      reason: "Workbook export published to Google Sheets."
    });
    return ok(published);
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    return serverError(error instanceof Error ? error.message : "Não foi possível publicar a exportação no Google Sheets.");
  }
}

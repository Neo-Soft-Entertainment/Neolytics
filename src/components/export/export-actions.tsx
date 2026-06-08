"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useEntitlements } from "@/features/entitlements/hooks";

export function ExportActions({
  csvHref,
  xlsxHref,
  pdfHref,
  googleSheetsEndpoint,
  label = "Export"
}: {
  csvHref: string;
  xlsxHref: string;
  pdfHref?: string;
  googleSheetsEndpoint: string;
  label?: string;
}) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const entitlements = useEntitlements();
  const canExportPdf = entitlements.canUse("pdfExport");
  const resolvedPdfHref = pdfHref
    ?? (xlsxHref.includes("format=xlsx")
      ? xlsxHref.replace("format=xlsx", "format=pdf")
      : `${xlsxHref}${xlsxHref.includes("?") ? "&" : "?"}format=pdf`);

  async function publishGoogleSheet() {
    setMessage(null);
    setIsPublishing(true);

    const response = await fetch(googleSheetsEndpoint, {
      method: "POST"
    });

    setIsPublishing(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(payload?.message ?? "Unable to publish to Google Sheets.");
      return;
    }

    const payload = (await response.json()) as { url: string };
    window.open(payload.url, "_blank", "noopener,noreferrer");
    setMessage("Google Sheets report created.");
  }

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isPublishing}>
            {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={xlsxHref}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Download Excel
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={csvHref}>
              <FileText className="mr-2 h-4 w-4" />
              Download CSV
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canExportPdf}
            onSelect={(event) => {
              if (!canExportPdf) {
                event.preventDefault();
                setMessage("Seu acesso atual não inclui este recurso. Faça upgrade para continuar usando este recurso.");
              }
            }}
          >
            <a href={canExportPdf ? resolvedPdfHref : undefined} className="flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Download PDF
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={publishGoogleSheet}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Send to Google Sheets
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}

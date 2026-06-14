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
  label = "Exportar"
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
    let resolvedValue0: any;
  if (xlsxHref.includes("format=xlsx")) {
    resolvedValue0 = xlsxHref.replace("format=xlsx", "format=pdf");
  } else {
        let resolvedValue4: any;
    if (xlsxHref.includes("?")) {
      resolvedValue4 = "&";
    } else {
      resolvedValue4 = "?";
    }
resolvedValue0 = `${xlsxHref}${resolvedValue4}format=pdf`;
  }
const resolvedPdfHref = pdfHref
    ?? (resolvedValue0);

  async function publishGoogleSheet() {
    setMessage(null);
    setIsPublishing(true);

    const response = await fetch(googleSheetsEndpoint, {
      method: "POST"
    });

    setIsPublishing(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(payload?.message ?? "Não foi possível publicar no Google Sheets.");
      return;
    }

    const payload = (await response.json()) as { url: string };
    window.open(payload.url, "_blank", "noopener,noreferrer");
    setMessage("Relatório do Google Sheets criado.");
  }

    let resolvedValue1: any;
  if (isPublishing) {
    resolvedValue1 = <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
  } else {
    resolvedValue1 = null;
  }
  let resolvedValue2: any;
  if (canExportPdf) {
    resolvedValue2 = resolvedPdfHref;
  } else {
    resolvedValue2 = undefined;
  }
  let resolvedValue3: any;
  if (message) {
    resolvedValue3 = <p className="text-xs text-muted-foreground">{message}</p>;
  } else {
    resolvedValue3 = null;
  }
return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isPublishing}>
            {resolvedValue1}
            {label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={xlsxHref}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Baixar Excel
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={csvHref}>
              <FileText className="mr-2 h-4 w-4" />
              Baixar CSV
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canExportPdf}
            onSelect={(event: any) => {
              if (!canExportPdf) {
                event.preventDefault();
                setMessage("Seu acesso atual não inclui este recurso. Faça upgrade para continuar usando este recurso.");
              }
            }}
          >
            <a href={resolvedValue2} className="flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Baixar PDF
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={publishGoogleSheet}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Enviar para Google Sheets
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {resolvedValue3}
    </div>
  );
}

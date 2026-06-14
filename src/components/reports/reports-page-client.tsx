"use client";

import { SubscriptionPlan } from "@prisma/client";
import { useState } from "react";

import { PageHero } from "@/components/app-shell/page-hero";
import { useI18n } from "@/components/i18n-provider";
import { ExportActions } from "@/components/export/export-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCreateReport, useReports } from "@/features/reports/hooks";

export function ReportsPageClient({
  subscriptionPlan
}: {
  subscriptionPlan: SubscriptionPlan;
}) {
  const t = useI18n();
  const reportsQuery = useReports();
  const createReport = useCreateReport();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [tag, setTag] = useState("");
  const isPro = subscriptionPlan === SubscriptionPlan.PRO;

  async function handleCreateReport() {
    if (!title.trim()) {
      return;
    }

    setError(null);

    try {
      await createReport.mutateAsync({
        title,
        genre: genre || undefined,
        tag: tag || undefined
      });
      setTitle("");
      setGenre("");
      setTag("");
    } catch (submissionError) {
            let resolvedValue0: any;
      if (submissionError instanceof Error) {
        resolvedValue0 = submissionError.message;
      } else {
        resolvedValue0 = t("reports.generateError");
      }
setError(resolvedValue0);
    }
  }

    let resolvedValue1: any;
  if (isPro) {
    resolvedValue1 = t("reports.proLive");
  } else {
    resolvedValue1 = t("reports.standardLive");
  }
  let resolvedValue2: any;
  if (isPro) {
    resolvedValue2 = t("reports.proLiveCopy");
  } else {
    resolvedValue2 = t("reports.standardLiveCopy");
  }
  let resolvedValue3: any;
  if (createReport.isPending) {
    resolvedValue3 = t("reports.generating");
  } else {
    resolvedValue3 = t("reports.generateReport");
  }
  let resolvedValue4: any;
  if (error) {
    resolvedValue4 = <p className="text-sm text-destructive md:col-span-4">{error}</p>;
  } else {
    resolvedValue4 = null;
  }
  let resolvedValue5: any;
  if (reportsQuery.isLoading) {
    resolvedValue5 = (
            <p className="text-sm text-muted-foreground">{t("reports.loading")}</p>
          );
  } else {
    resolvedValue5 = (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("reports.title")}</TableHead>
                    <TableHead>{t("reports.type")}</TableHead>
                    <TableHead>{t("finance.status")}</TableHead>
                    <TableHead>{t("reports.created")}</TableHead>
                    <TableHead>{t("reports.export")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportsQuery.data?.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{report.title}</TableCell>
                      <TableCell>{report.reportType}</TableCell>
                      <TableCell>{report.status}</TableCell>
                      <TableCell>{new Date(report.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <ExportActions
                          label={t("common.export")}
                          xlsxHref={`/api/exports/reports/${report.id}?format=xlsx`}
                          csvHref={`/api/exports/reports/${report.id}?format=csv`}
                          googleSheetsEndpoint={`/api/exports/reports/${report.id}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {reportsQuery.data?.slice(0, 3).map((report) => {
                let resolvedValue6: any;
                if (report.metadata?.decisionBrief) {
                  resolvedValue6 = (
                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="rounded-2xl border p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Decisão</p>
                          <p className="mt-2 text-sm text-foreground">{report.metadata.decisionBrief.recommendation}</p>
                        </div>
                        <div className="rounded-2xl border p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tese de mercado</p>
                          <p className="mt-2 text-sm text-muted-foreground">{report.metadata.decisionBrief.marketThesis}</p>
                        </div>
                        <div className="rounded-2xl border p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Risco real</p>
                          <p className="mt-2 text-sm text-muted-foreground">{report.metadata.decisionBrief.mainRisk}</p>
                        </div>
                        <div className="rounded-2xl border p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Próximos testes</p>
                          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            {report.metadata.decisionBrief.nextMoves.slice(0, 4).map((move) => (
                              <li key={move}>- {move}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                } else {
                  resolvedValue6 = null;
                }
                let resolvedValue7: any;
                if (report.metadata?.segment) {
                  resolvedValue7 = (
                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="rounded-2xl border p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("reports.marketSize")}</p>
                          <p className="mt-2 font-semibold">{report.metadata.segment.marketSizeLabel}</p>
                        </div>
                        <div className="rounded-2xl border p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("reports.opportunity")}</p>
                          <p className="mt-2 font-semibold">{report.metadata.segment.opportunityScore}</p>
                        </div>
                        <div className="rounded-2xl border p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("opportunities.risk")}</p>
                          <p className="mt-2 font-semibold">{report.metadata.segment.riskScore}</p>
                        </div>
                        <div className="rounded-2xl border p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("opportunities.confidence")}</p>
                          <p className="mt-2 font-semibold">
                            {report.metadata.segment.confidenceLabel} ({report.metadata.segment.confidenceScore})
                          </p>
                        </div>
                      </div>
                    );
                } else {
                  resolvedValue7 = null;
                }
                let resolvedValue8: any;
                if (report.metadata?.operatingBrief) {
                  resolvedValue8 = (
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("reports.boardDirective")}</p>
                          <p className="mt-2 text-sm text-muted-foreground">{report.metadata.operatingBrief.boardDirective}</p>
                        </div>
                        <div className="rounded-2xl border p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("reports.commercialDirective")}</p>
                          <p className="mt-2 text-sm text-muted-foreground">{report.metadata.operatingBrief.commercialDirective}</p>
                        </div>
                        <div className="rounded-2xl border p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("reports.operatingDirective")}</p>
                          <p className="mt-2 text-sm text-muted-foreground">{report.metadata.operatingBrief.operatingDirective}</p>
                        </div>
                      </div>
                    );
                } else {
                  resolvedValue8 = null;
                }
                return (
                <details key={`summary-${report.id}`} className="rounded-[1rem] border border-dashed p-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    {report.title}
                  </summary>
                  <div className="mt-3 space-y-3 text-sm">
                    {resolvedValue6}
                    {resolvedValue7}
                    {resolvedValue8}
                    <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-2xl border bg-muted/30 p-3 text-xs">
                      {report.content ?? ""}
                    </pre>
                  </div>
                </details>
              );
              })}
            </div>
          );
  }
return (
    <div className="space-y-6">
      <PageHero
        title={t("reports.pageTitle")}
        description={t("reports.pageDescription")}
        summary={(
          <div className="grid gap-2.5 rounded-[1rem] border border-white/10 bg-background/70 p-3 text-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t("reports.generatedReports")}</span>
              <span className="font-medium">{reportsQuery.data?.length ?? 0}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/35 p-3 dark:bg-white/[0.04]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                {resolvedValue1}
              </p>
              <p className="mt-2 font-medium">
                {resolvedValue2}
              </p>
            </div>
          </div>
        )}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.generateReport")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("reports.title")}</Label>
            <Input id="title" value={title} onChange={(event: any) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="genre">{t("reports.genreSlug")}</Label>
            <Input id="genre" value={genre} onChange={(event: any) => setGenre(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag">{t("reports.tagSlug")}</Label>
            <Input id="tag" value={tag} onChange={(event: any) => setTag(event.target.value)} />
          </div>
          <div className="md:col-span-4">
            <Button onClick={handleCreateReport} disabled={createReport.isPending}>
              {resolvedValue3}
            </Button>
          </div>
          {resolvedValue4}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.generatedReports")}</CardTitle>
        </CardHeader>
        <CardContent>
          {resolvedValue5}
        </CardContent>
      </Card>
    </div>
  );
}

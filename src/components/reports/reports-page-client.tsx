"use client";

import { SubscriptionPlan } from "@prisma/client";
import { useState } from "react";

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
      setError(submissionError instanceof Error ? submissionError.message : t("reports.generateError"));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("reports.pageTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("reports.pageDescription")}
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-3 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-medium">{isPro ? t("reports.proLive") : t("reports.standardLive")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isPro
                ? t("reports.proLiveCopy")
                : t("reports.standardLiveCopy")}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.generateReport")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="title">{t("reports.title")}</Label>
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="genre">{t("reports.genreSlug")}</Label>
            <Input id="genre" value={genre} onChange={(event) => setGenre(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag">{t("reports.tagSlug")}</Label>
            <Input id="tag" value={tag} onChange={(event) => setTag(event.target.value)} />
          </div>
          <div className="md:col-span-3">
            <Button onClick={handleCreateReport} disabled={createReport.isPending}>
              {createReport.isPending ? t("reports.generating") : t("reports.generateReport")}
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive md:col-span-3">{error}</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.generatedReports")}</CardTitle>
        </CardHeader>
        <CardContent>
          {reportsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("reports.loading")}</p>
          ) : (
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
              {reportsQuery.data?.slice(0, 3).map((report) => (
                <Card key={`summary-${report.id}`} className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {report.metadata?.segment ? (
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
                    ) : null}
                    {report.metadata?.operatingBrief ? (
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
                    ) : null}
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border bg-muted/30 p-4 text-xs">
                      {(report.content ?? "").split("\n").slice(0, 18).join("\n")}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

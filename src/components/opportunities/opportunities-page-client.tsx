"use client";

import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";
import { ExportActions } from "@/components/export/export-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOpportunities } from "@/features/opportunities/hooks";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function OpportunitiesPageClient() {
  const t = useI18n();
  const query = useOpportunities();

  return (
    <div className="space-y-6">
      <Card className="aurora-panel overflow-hidden border-white/10 shadow-[0_30px_80px_rgba(14,165,233,0.1)]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("opportunities.pageTitle")}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {t("opportunities.pageDescription")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-white/10 bg-white/55 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
                {t("opportunities.rankedMarketScan")}
              </span>
              <span className="rounded-full border border-white/10 bg-white/55 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
                {t("opportunities.revenueRiskConfidence")}
              </span>
            </div>
          </div>
          <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-background/70 p-4 text-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t("opportunities.candidates")}</span>
              <span className="font-medium">{query.data?.length ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t("opportunities.topOpportunity")}</span>
              <span className="font-medium">{query.data?.[0] ? formatNumber(query.data[0].score) : "N/A"}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/35 p-3 dark:bg-white/[0.04]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{t("opportunities.readingMode")}</p>
              <p className="mt-2 font-medium">{t("opportunities.readingModeCopy")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{t("opportunities.finder")}</CardTitle>
          <ExportActions
            label={t("common.exportOpportunities")}
            xlsxHref="/api/exports/opportunities?format=xlsx"
            csvHref="/api/exports/opportunities?format=csv"
            googleSheetsEndpoint="/api/exports/opportunities"
          />
        </CardHeader>
        <CardContent>
          {query.data && query.data.length > 0 ? (
            <div className="mb-4 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("opportunities.topOpportunity")}</p>
                <p className="mt-2 text-2xl font-semibold">{formatNumber(query.data[0]?.score ?? null)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("opportunities.topConfidence")}</p>
                <p className="mt-2 text-2xl font-semibold">{formatNumber(query.data[0]?.confidenceScore ?? null)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("opportunities.medianRisk")}</p>
                <p className="mt-2 text-2xl font-semibold">{formatNumber(query.data[Math.floor(query.data.length / 2)]?.riskScore ?? null)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("opportunities.bestMarketSize")}</p>
                <p className="mt-2 text-2xl font-semibold">{query.data[0]?.marketSizeLabel ?? t("common.na")}</p>
              </div>
            </div>
          ) : null}
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("opportunities.loading")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("games.game")}</TableHead>
                  <TableHead>{t("opportunities.opportunityScore")}</TableHead>
                  <TableHead>{t("opportunities.risk")}</TableHead>
                  <TableHead>{t("opportunities.revenuePotential")}</TableHead>
                  <TableHead>{t("games.reviewScore")}</TableHead>
                  <TableHead>{t("opportunities.competition")}</TableHead>
                  <TableHead>{t("opportunities.confidence")}</TableHead>
                  <TableHead>{t("compare.medianNetRevenue")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.map((item) => (
                  <TableRow key={item.appId}>
                    <TableCell>
                      <Link className="font-medium hover:underline" href={`/games/${item.appId}`}>
                        {item.name}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("opportunities.marketPremium", { label: item.marketSizeLabel, percent: item.premiumSharePercent })}
                      </p>
                    </TableCell>
                    <TableCell>{item.score}</TableCell>
                    <TableCell>{item.riskScore}</TableCell>
                    <TableCell>{item.revenuePotentialScore}</TableCell>
                    <TableCell>{item.reviewScore ? `${item.reviewScore.toFixed(1)}%` : t("common.na")}</TableCell>
                    <TableCell>{item.competitionCount}</TableCell>
                    <TableCell>{item.confidenceScore}</TableCell>
                    <TableCell>{formatCurrency(item.medianNetRevenueCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

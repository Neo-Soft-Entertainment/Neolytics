"use client";

import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportActions } from "@/components/export/export-actions";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCompareGames } from "@/features/games/hooks";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function ComparePageClient() {
  const t = useI18n();
  const [inputValue, setInputValue] = useState("");
  const [appIds, setAppIds] = useState<number[]>([]);
  const query = useCompareGames(appIds);

  function addAppId() {
    const parsed = Number(inputValue);

    if (!Number.isInteger(parsed) || parsed <= 0 || appIds.includes(parsed)) {
      return;
    }

    setAppIds((current) => [...current, parsed]);
    setInputValue("");
  }

  return (
    <div className="space-y-6">
      <Card className="aurora-panel overflow-hidden border-white/10 shadow-[0_30px_80px_rgba(14,165,233,0.1)]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("compare.pageTitle")}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {t("compare.pageDescription")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-white/10 bg-white/55 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
                {t("compare.sideBySideBenchmark")}
              </span>
              <span className="rounded-full border border-white/10 bg-white/55 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
                {t("compare.compSetAnalysis")}
              </span>
            </div>
          </div>
          <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-background/70 p-4 text-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t("compare.selectedTitles")}</span>
              <span className="font-medium">{appIds.length}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t("compare.mode")}</span>
              <span className="font-medium">{t("compare.modeValue")}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/35 p-3 dark:bg-white/[0.04]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{t("compare.tip")}</p>
              <p className="mt-2 font-medium">{t("compare.tipCopy")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
        <CardHeader>
          <CardTitle>{t("compare.comparisonSet")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              placeholder={t("compare.enterSteamAppId")}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
            />
            <Button onClick={addAppId}>{t("compare.add")}</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {appIds.map((appId) => (
              <Button key={appId} variant="secondary" onClick={() => setAppIds((current) => current.filter((value) => value !== appId))}>
                {appId}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{t("compare.results")}</CardTitle>
          <ExportActions
            label={t("common.exportCompare")}
            xlsxHref={`/api/exports/compare?format=xlsx&appIds=${appIds.join(",")}`}
            csvHref={`/api/exports/compare?format=csv&appIds=${appIds.join(",")}`}
            googleSheetsEndpoint={`/api/exports/compare?appIds=${appIds.join(",")}`}
          />
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("compare.loadTwoGames")}</p>
          ) : query.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("games.game")}</TableHead>
                  <TableHead>{t("games.price")}</TableHead>
                  <TableHead>{t("games.reviewScore")}</TableHead>
                  <TableHead>{t("games.reviews")}</TableHead>
                  <TableHead>{t("compare.medianSales")}</TableHead>
                  <TableHead>{t("compare.medianNetRevenue")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.map((game: any) => (
                  <TableRow key={game.id}>
                    <TableCell>{game.name}</TableCell>
                    <TableCell>{formatCurrency(game.priceCurrent?.finalPriceCents ?? null)}</TableCell>
                    <TableCell>{game.reviewScore ? `${game.reviewScore.toFixed(1)}%` : t("common.na")}</TableCell>
                    <TableCell>{formatNumber(game.reviewCount)}</TableCell>
                    <TableCell>{formatNumber(game.salesEstimates[0]?.medianEstimate ?? null)}</TableCell>
                    <TableCell>{formatCurrency(game.revenueEstimates[0]?.medianNetRevenueCents ?? null)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t("compare.addTwoGames")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

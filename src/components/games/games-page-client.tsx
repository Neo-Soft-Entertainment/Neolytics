"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import { PageHero } from "@/components/app-shell/page-hero";
import { useI18n } from "@/components/i18n-provider";
import { ErrorState } from "@/components/error-state";
import { ExportActions } from "@/components/export/export-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGameSearch } from "@/features/games/hooks";
import { formatCurrency, formatNumber } from "@/lib/utils";

function buildQueryString(filters: {
  query: string;
  genre: string;
  tag: string;
  minReviewScore: string;
}) {
  const params = new URLSearchParams();

  if (filters.query) {
    params.set("query", filters.query);
  }

  if (filters.genre) {
    params.set("genre", filters.genre);
  }

  if (filters.tag) {
    params.set("tag", filters.tag);
  }

  if (filters.minReviewScore && filters.minReviewScore !== "any") {
    params.set("minReviewScore", filters.minReviewScore);
  }

  return params.toString();
}

export function GamesPageClient() {
  const t = useI18n();
  const [filters, setFilters] = useState({
    query: "",
    genre: "",
    tag: "",
    minReviewScore: "any"
  });

  const deferredFilters = useDeferredValue(filters);
  const queryString = useMemo(() => buildQueryString(deferredFilters), [deferredFilters]);
  const query = useGameSearch(queryString);

    let resolvedValue0: any;
  if (query.data?.total) {
    resolvedValue0 = formatNumber(query.data.total);
  } else {
    resolvedValue0 = "0";
  }
  let resolvedValue1: any;
  if (filters.minReviewScore === "any") {
    resolvedValue1 = t("games.anyScore");
  } else {
    resolvedValue1 = `${filters.minReviewScore}%+`;
  }
  let resolvedValue2: any;
  if (query.isError) {
    resolvedValue2 = (
        <ErrorState title={t("games.searchFailed")} description={t("games.searchFailedDescription")} />
      );
  } else {
    resolvedValue2 = null;
  }
  let resolvedValue3: any;
  if (query.data?.total) {
    resolvedValue3 = t("games.resultsMatched", { count: formatNumber(query.data.total) });
  } else {
    resolvedValue3 = t("games.resultsHint");
  }
  let resolvedValue4: any;
  if (query.data?.steamSync) {
    resolvedValue4 = (
              <p className="text-xs text-muted-foreground">
                Live Steam sync: {query.data.steamSync.synced} updated, {query.data.steamSync.skipped} skipped, {query.data.steamSync.failed} failed.
              </p>
            );
  } else {
    resolvedValue4 = null;
  }
  let resolvedValue5: any;
  if (query.isLoading) {
    resolvedValue5 = (
            <p className="text-sm text-muted-foreground">{t("games.loading")}</p>
          );
  } else {
        let resolvedValue6: any;
    if (query.data?.items?.length) {
      resolvedValue6 = (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("games.game")}</TableHead>
                  <TableHead>{t("projects.genres")}</TableHead>
                  <TableHead>{t("games.price")}</TableHead>
                  <TableHead>{t("games.reviewScore")}</TableHead>
                  <TableHead>{t("games.reviews")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((game: any) => {
                  let resolvedValue7: any;
                  if (game.reviewScore) {
                    resolvedValue7 = `${game.reviewScore.toFixed(1)}%`;
                  } else {
                    resolvedValue7 = t("common.na");
                  }
                  return (
                  <TableRow key={game.id}>
                    <TableCell>
                      <Link className="font-medium hover:underline" href={`/games/${game.appId}`}>
                        {game.name}
                      </Link>
                    </TableCell>
                    <TableCell>{game.genres.map((genre: any) => genre.steamGenre.name).join(", ") || t("common.na")}</TableCell>
                    <TableCell>{formatCurrency(game.priceCurrent?.finalPriceCents ?? null)}</TableCell>
                    <TableCell>{resolvedValue7}</TableCell>
                    <TableCell>{formatNumber(game.reviewCount)}</TableCell>
                  </TableRow>
                );
                })}
              </TableBody>
            </Table>
          );
    } else {
      resolvedValue6 = (
            <p className="text-sm text-muted-foreground">{t("games.noMatches")}</p>
          );
    }
resolvedValue5 = resolvedValue6;
  }
return (
    <div className="space-y-6">
      <PageHero
        title={t("games.pageTitle")}
        description={t("games.pageDescription")}
        actions={(
          <>
            <span className="rounded-full border border-white/10 bg-white/55 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
              {t("games.catalogExploration")}
            </span>
            <span className="rounded-full border border-white/10 bg-white/55 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
              {t("games.searchToCompSet")}
            </span>
          </>
        )}
        summary={(
          <div className="grid gap-2.5 rounded-[1rem] border border-white/10 bg-background/70 p-3 text-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t("games.matches")}</span>
              <span className="font-medium">{resolvedValue0}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t("games.reviewFilter")}</span>
              <span className="font-medium">{resolvedValue1}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/35 p-3 dark:bg-white/[0.04]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{t("games.bestUse")}</p>
              <p className="mt-2 font-medium">{t("games.bestUseCopy")}</p>
            </div>
          </div>
        )}
      />
      <Card className="overflow-hidden">
        <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
        <CardHeader>
          <CardTitle>{t("games.searchFilters")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="query">{t("games.search")}</Label>
            <Input
              id="query"
              value={filters.query}
              onChange={(event: any) => setFilters((current: any) => ({ ...current, query: event.target.value }))}
              placeholder={t("games.search")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="genre">{t("games.genre")}</Label>
            <Input
              id="genre"
              value={filters.genre}
              onChange={(event: any) => setFilters((current: any) => ({ ...current, genre: event.target.value }))}
              placeholder={t("games.genre")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag">{t("games.tag")}</Label>
            <Input
              id="tag"
              value={filters.tag}
              onChange={(event: any) => setFilters((current: any) => ({ ...current, tag: event.target.value }))}
              placeholder={t("games.tag")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("games.minReviewScore")}</Label>
            <Select
              value={filters.minReviewScore}
              onValueChange={(value: any) => setFilters((current: any) => ({ ...current, minReviewScore: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("games.anyScore")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("games.anyScore")}</SelectItem>
                <SelectItem value="60">60%+</SelectItem>
                <SelectItem value="75">75%+</SelectItem>
                <SelectItem value="85">85%+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      {resolvedValue2}
      <Card className="overflow-hidden">
        <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>{t("games.results")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {resolvedValue3}
            </p>
            {resolvedValue4}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setFilters({ query: "", genre: "", tag: "", minReviewScore: "any" })}>
              {t("games.reset")}
            </Button>
            <ExportActions
              label={t("common.exportGames")}
              xlsxHref={`/api/exports/games?format=xlsx&${queryString}`}
              csvHref={`/api/exports/games?format=csv&${queryString}`}
              googleSheetsEndpoint={`/api/exports/games?${queryString}`}
            />
          </div>
        </CardHeader>
        <CardContent>
          {resolvedValue5}
        </CardContent>
      </Card>
    </div>
  );
}

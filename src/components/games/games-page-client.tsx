"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
  const [filters, setFilters] = useState({
    query: "",
    genre: "",
    tag: "",
    minReviewScore: "any"
  });

  const queryString = useMemo(() => buildQueryString(filters), [filters]);
  const query = useGameSearch(queryString);

  return (
    <div className="space-y-6">
      <Card className="aurora-panel overflow-hidden border-white/10 shadow-[0_30px_80px_rgba(14,165,233,0.1)]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Games</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Search Steam titles, narrow by genre or tag, and move quickly from broad discovery to a viable comparison set.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-white/10 bg-white/55 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
                Catalog exploration
              </span>
              <span className="rounded-full border border-white/10 bg-white/55 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
                Search to comp set
              </span>
            </div>
          </div>
          <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-background/70 p-4 text-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Matches</span>
              <span className="font-medium">{query.data?.total ? formatNumber(query.data.total) : "0"}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Review filter</span>
              <span className="font-medium">{filters.minReviewScore === "any" ? "Any score" : `${filters.minReviewScore}%+`}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/35 p-3 dark:bg-white/[0.04]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Best use</p>
              <p className="mt-2 font-medium">Start wide, isolate the niche, then save the strongest candidates for compare, reports, and project validation.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
        <CardHeader>
          <CardTitle>Search filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="query">Search</Label>
            <Input
              id="query"
              value={filters.query}
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="Balatro, city builder..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="genre">Genre</Label>
            <Input
              id="genre"
              value={filters.genre}
              onChange={(event) => setFilters((current) => ({ ...current, genre: event.target.value }))}
              placeholder="strategy, adventure..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag">Tag</Label>
            <Input
              id="tag"
              value={filters.tag}
              onChange={(event) => setFilters((current) => ({ ...current, tag: event.target.value }))}
              placeholder="deckbuilder, co-op..."
            />
          </div>
          <div className="space-y-2">
            <Label>Min review score</Label>
            <Select
              value={filters.minReviewScore}
              onValueChange={(value) => setFilters((current) => ({ ...current, minReviewScore: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any score</SelectItem>
                <SelectItem value="60">60%+</SelectItem>
                <SelectItem value="75">75%+</SelectItem>
                <SelectItem value="85">85%+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      {query.isError ? (
        <ErrorState title="Search failed" description="We could not load the games list." />
      ) : null}
      <Card className="overflow-hidden">
        <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Results</CardTitle>
            <p className="text-sm text-muted-foreground">
              {query.data?.total ? `${formatNumber(query.data.total)} games matched the current filters.` : "Adjust the inputs to explore the catalog."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setFilters({ query: "", genre: "", tag: "", minReviewScore: "any" })}>
              Reset
            </Button>
            <ExportActions
              label="Export games"
              xlsxHref={`/api/exports/games?format=xlsx&${queryString}`}
              csvHref={`/api/exports/games?format=csv&${queryString}`}
              googleSheetsEndpoint={`/api/exports/games?${queryString}`}
            />
          </div>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading games...</p>
          ) : query.data?.items?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Genres</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Review score</TableHead>
                  <TableHead>Reviews</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((game: any) => (
                  <TableRow key={game.id}>
                    <TableCell>
                      <Link className="font-medium hover:underline" href={`/games/${game.appId}`}>
                        {game.name}
                      </Link>
                    </TableCell>
                    <TableCell>{game.genres.map((genre: any) => genre.steamGenre.name).join(", ") || "N/A"}</TableCell>
                    <TableCell>{formatCurrency(game.priceCurrent?.finalPriceCents ?? null)}</TableCell>
                    <TableCell>{game.reviewScore ? `${game.reviewScore.toFixed(1)}%` : "N/A"}</TableCell>
                    <TableCell>{formatNumber(game.reviewCount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No games matched the current filters.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

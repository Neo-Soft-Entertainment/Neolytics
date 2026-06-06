"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ErrorState } from "@/components/error-state";
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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Games</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search Steam titles, narrow by genre or tag, and inspect the strongest candidates.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
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
            <Label htmlFor="genre">Genre slug</Label>
            <Input
              id="genre"
              value={filters.genre}
              onChange={(event) => setFilters((current) => ({ ...current, genre: event.target.value }))}
              placeholder="strategy"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag">Tag slug</Label>
            <Input
              id="tag"
              value={filters.tag}
              onChange={(event) => setFilters((current) => ({ ...current, tag: event.target.value }))}
              placeholder="deckbuilder"
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Results</CardTitle>
          <Button variant="outline" onClick={() => setFilters({ query: "", genre: "", tag: "", minReviewScore: "any" })}>
            Reset
          </Button>
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

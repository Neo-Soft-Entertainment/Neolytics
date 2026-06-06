"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCompareGames } from "@/features/games/hooks";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function ComparePageClient() {
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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Compare games</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add Steam app IDs to compare pricing, reviews, sales estimates, and revenue side by side.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Comparison set</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Steam app ID"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
            />
            <Button onClick={addAppId}>Add</Button>
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
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">Load at least two games to compare.</p>
          ) : query.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Review score</TableHead>
                  <TableHead>Reviews</TableHead>
                  <TableHead>Median sales</TableHead>
                  <TableHead>Median net revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.map((game: any) => (
                  <TableRow key={game.id}>
                    <TableCell>{game.name}</TableCell>
                    <TableCell>{formatCurrency(game.priceCurrent?.finalPriceCents ?? null)}</TableCell>
                    <TableCell>{game.reviewScore ? `${game.reviewScore.toFixed(1)}%` : "N/A"}</TableCell>
                    <TableCell>{formatNumber(game.reviewCount)}</TableCell>
                    <TableCell>{formatNumber(game.salesEstimates[0]?.medianEstimate ?? null)}</TableCell>
                    <TableCell>{formatCurrency(game.revenueEstimates[0]?.medianNetRevenueCents ?? null)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Add at least two app IDs to compare games.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

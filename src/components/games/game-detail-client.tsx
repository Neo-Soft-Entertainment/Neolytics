"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/error-state";
import { ExportActions } from "@/components/export/export-actions";
import { ChartCard } from "@/components/charts/chart-card";
import { HistoryLineChart } from "@/components/charts/history-line-chart";
import { useGameDetails, useGameHistory } from "@/features/games/hooks";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function GameDetailClient({ appId }: { appId: number }) {
  const detailsQuery = useGameDetails(appId);
  const historyQuery = useGameHistory(appId);

  if (detailsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading game details...</p>;
  }

  if (detailsQuery.isError || !detailsQuery.data) {
    return <ErrorState title="Game unavailable" description="We could not load this Steam game." />;
  }

  const game: any = detailsQuery.data;
  const history: any = historyQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {game.genres.map((genre: any) => (
              <Badge key={genre.steamGenreId ?? genre.steamGenre.id} variant="secondary">
                {genre.steamGenre.name}
              </Badge>
            ))}
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{game.name}</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{game.shortDescription ?? "No description available."}</p>
          </div>
        </div>
        <Card className="w-full max-w-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <CardTitle>Current snapshot</CardTitle>
            <ExportActions
              label="Export"
              xlsxHref={`/api/exports/games/${appId}?format=xlsx`}
              csvHref={`/api/exports/games/${appId}?format=csv`}
              googleSheetsEndpoint={`/api/exports/games/${appId}`}
            />
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Price</span>
              <span>{formatCurrency(game.priceCurrent?.finalPriceCents ?? null)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Reviews</span>
              <span>{formatNumber(game.reviewCount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Review score</span>
              <span>{game.reviewScore ? `${game.reviewScore.toFixed(1)}%` : "N/A"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current players</span>
              <span>{formatNumber(game.currentPlayers)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estimated sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Low: {formatNumber(game.salesEstimates[0]?.lowEstimate ?? null)}</p>
            <p>Median: {formatNumber(game.salesEstimates[0]?.medianEstimate ?? null)}</p>
            <p>High: {formatNumber(game.salesEstimates[0]?.highEstimate ?? null)}</p>
            <p>Confidence: {game.salesEstimates[0]?.confidence ?? "N/A"}</p>
            <p className="text-muted-foreground">{game.salesEstimates[0]?.explanation ?? "No estimate available yet."}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Estimated revenue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Low net: {formatCurrency(game.revenueEstimates[0]?.lowNetRevenueCents ?? null)}</p>
            <p>Median net: {formatCurrency(game.revenueEstimates[0]?.medianNetRevenueCents ?? null)}</p>
            <p>High net: {formatCurrency(game.revenueEstimates[0]?.highNetRevenueCents ?? null)}</p>
            <p>Confidence: {game.revenueEstimates[0]?.confidence ?? "N/A"}</p>
            <p className="text-muted-foreground">{game.revenueEstimates[0]?.explanation ?? "No revenue estimate available yet."}</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard title="Price history">
          {history?.priceHistory?.length ? (
            <HistoryLineChart
              data={history.priceHistory.map((item: any) => ({
                date: new Date(item.snapshotDate).toLocaleDateString(),
                price: (item.finalPriceCents ?? 0) / 100
              }))}
              xKey="date"
              yKey="price"
            />
          ) : (
            <p className="text-sm text-muted-foreground">No price history yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Review history">
          {history?.reviewHistory?.length ? (
            <HistoryLineChart
              data={history.reviewHistory.map((item: any) => ({
                date: new Date(item.snapshotDate).toLocaleDateString(),
                reviews: item.totalReviews
              }))}
              xKey="date"
              yKey="reviews"
            />
          ) : (
            <p className="text-sm text-muted-foreground">No review history yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Player history">
          {history?.playerHistory?.length ? (
            <HistoryLineChart
              data={history.playerHistory.map((item: any) => ({
                date: new Date(item.snapshotDate).toLocaleDateString(),
                players: item.currentPlayers
              }))}
              xKey="date"
              yKey="players"
            />
          ) : (
            <p className="text-sm text-muted-foreground">No player history yet.</p>
          )}
        </ChartCard>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Developers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {game.developers.map((developer: any) => developer.steamDeveloper.name).join(", ") || "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Publishers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {game.publishers.map((publisher: any) => publisher.steamPublisher.name).join(", ") || "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

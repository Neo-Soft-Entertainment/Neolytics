"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/error-state";
import { ExportActions } from "@/components/export/export-actions";
import { ChartCard } from "@/components/charts/chart-card";
import { HistoryLineChart } from "@/components/charts/history-line-chart";
import { useGameDatabaseProfile, useGameDetails, useGameHistory, useGameSnapshots } from "@/features/games/hooks";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function GameDetailClient({ appId }: { appId: number }) {
  const detailsQuery = useGameDetails(appId);
  const historyQuery = useGameHistory(appId);
  const databaseProfileQuery = useGameDatabaseProfile(appId);
  const snapshotsQuery = useGameSnapshots(appId, Boolean(detailsQuery.data?.steamXrayAccess.rawSnapshotsBetaAvailable));

  if (detailsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading game details...</p>;
  }

  if (detailsQuery.isError || !detailsQuery.data) {
    return <ErrorState title="Game unavailable" description="We could not load this Steam game." />;
  }

  const game: any = detailsQuery.data;
  const history: any = historyQuery.data;
  const snapshots: any[] = snapshotsQuery.data ?? [];
  const databaseProfile = databaseProfileQuery.data;

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
            <div className="space-y-2">
              <CardTitle>Current snapshot</CardTitle>
              <Badge variant="outline">{`Steam X-Ray · ${game.steamXrayAccess.label}`}</Badge>
            </div>
            <ExportActions
              label="Export"
              xlsxHref={`/api/exports/games/${appId}?format=xlsx`}
              csvHref={`/api/exports/games/${appId}?format=csv`}
              googleSheetsEndpoint={`/api/exports/games/${appId}`}
            />
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              {game.steamXrayAccess.playerHistoryAvailable
                ? `${game.steamXrayAccess.historyLimit} days of history are available on this plan.`
                : `This plan includes ${game.steamXrayAccess.historyLimit} days of price and review history.`}
            </p>
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
      {databaseProfile ? (
        <Card className="overflow-hidden border-cyan-400/20 bg-gradient-to-br from-card via-card to-cyan-500/10">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Neolytics Steam Database</CardTitle>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  SteamDB-style intelligence generated from official Steam data, Neolytics snapshots, and deterministic scoring. No SteamDB API or scraping is used.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{databaseProfile.classification}</Badge>
                <Badge variant="outline">{`${databaseProfile.confidenceLevel} confidence`}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Opportunity</p>
                <p className="mt-2 text-3xl font-semibold">{databaseProfile.opportunityScore}</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Data quality</p>
                <p className="mt-2 text-3xl font-semibold">{databaseProfile.dataQuality.score}</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Peer slice</p>
                <p className="mt-2 text-3xl font-semibold">{formatNumber(databaseProfile.dataQuality.peerDatasetSize)}</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Momentum</p>
                <p className="mt-2 text-3xl font-semibold">{databaseProfile.trendDetection.releaseMomentum}</p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Weighted score factors</h3>
                {databaseProfile.weightedFactors.map((factor) => (
                  <div key={factor.name} className="rounded-2xl border bg-background/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{factor.name}</p>
                      <Badge variant="outline">{`${factor.score}/100 · ${factor.weight}%`}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{factor.evidence}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border bg-background/70 p-4">
                  <h3 className="text-sm font-semibold">Observed history</h3>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    <p>{`Lowest observed price: ${formatCurrency(databaseProfile.observedHistory.price.lowestObservedPriceCents)}`}</p>
                    <p>{`Highest observed price: ${formatCurrency(databaseProfile.observedHistory.price.highestObservedPriceCents)}`}</p>
                    <p>{`Discount snapshots: ${formatNumber(databaseProfile.observedHistory.price.discountSnapshotCount)}`}</p>
                    <p>{`Peak observed players: ${formatNumber(databaseProfile.observedHistory.players.peakObservedPlayers)}`}</p>
                    <p>{`Average observed players: ${formatNumber(databaseProfile.observedHistory.players.averageObservedPlayers)}`}</p>
                  </div>
                </div>
                <div className="rounded-2xl border bg-background/70 p-4">
                  <h3 className="text-sm font-semibold">Trend detection</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{databaseProfile.trendDetection.explanation}</p>
                  {databaseProfile.trendDetection.emergingTags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {databaseProfile.trendDetection.emergingTags.map((tag) => (
                        <Badge key={tag.name} variant="secondary">
                          {`${tag.name} ${tag.recentSharePercent}% recent`}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-2xl border bg-background/70 p-4">
                  <h3 className="text-sm font-semibold">Sources used</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{databaseProfile.sources.join(" · ")}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border bg-background/70 p-4">
                <h3 className="text-sm font-semibold">Direct competitors</h3>
                <div className="mt-3 space-y-2">
                  {databaseProfile.competitiveIntelligence.directCompetitors.length > 0 ? (
                    databaseProfile.competitiveIntelligence.directCompetitors.slice(0, 5).map((competitor) => (
                      <Link key={competitor.appId} className="block rounded-xl border p-3 text-sm hover:bg-muted/50" href={`/games/${competitor.appId}`}>
                        <span className="font-medium">{competitor.name}</span>
                        <span className="mt-1 block text-muted-foreground">
                          {`${formatNumber(competitor.reviewCount)} reviews · ${competitor.reviewScore ? `${competitor.reviewScore.toFixed(1)}%` : "N/A"} score · ${formatCurrency(competitor.estimatedMedianNetRevenueCents)}`}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No direct competitors identified in the current database slice.</p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <h3 className="text-sm font-semibold">Recent launches to watch</h3>
                <div className="mt-3 space-y-2">
                  {databaseProfile.competitiveIntelligence.recentSuccessfulLaunches.length > 0 ? (
                    databaseProfile.competitiveIntelligence.recentSuccessfulLaunches.slice(0, 5).map((competitor) => (
                      <Link key={competitor.appId} className="block rounded-xl border p-3 text-sm hover:bg-muted/50" href={`/games/${competitor.appId}`}>
                        <span className="font-medium">{competitor.name}</span>
                        <span className="mt-1 block text-muted-foreground">
                          {`${formatNumber(competitor.reviewCount)} reviews · ${competitor.reviewScore ? `${competitor.reviewScore.toFixed(1)}%` : "N/A"} score`}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent breakout launch identified yet.</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
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
          {game.steamXrayAccess.playerHistoryAvailable && history?.playerHistory?.length ? (
            <HistoryLineChart
              data={history.playerHistory.map((item: any) => ({
                date: new Date(item.snapshotDate).toLocaleDateString(),
                players: item.currentPlayers
              }))}
              xKey="date"
              yKey="players"
            />
          ) : game.steamXrayAccess.playerHistoryAvailable ? (
            <p className="text-sm text-muted-foreground">No player history yet.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Player concurrency history starts on Plus.</p>
          )}
        </ChartCard>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Steam X-Ray scope</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{`Current tier: ${game.steamXrayAccess.label}.`}</p>
          <p>{`History window: ${game.steamXrayAccess.historyLimit} days for chart data.`}</p>
          <p>{game.steamXrayAccess.playerHistoryAvailable ? "Player history is available on this plan." : "Player history unlocks on Plus and Pro."}</p>
          <p>{game.steamXrayAccess.rawSnapshotsBetaAvailable ? "Raw snapshot stream beta is enabled on this plan." : "Raw snapshot stream beta is available on Pro."}</p>
        </CardContent>
      </Card>
      {game.steamXrayAccess.rawSnapshotsBetaAvailable ? (
        <Card>
          <CardHeader>
            <CardTitle>Raw snapshot stream beta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {snapshots.length > 0 ? (
              snapshots.slice(0, 10).map((snapshot) => (
                <div key={snapshot.snapshotDate} className="rounded-2xl border p-3">
                  <p className="font-medium">{new Date(snapshot.snapshotDate).toLocaleString()}</p>
                  <p className="text-muted-foreground">
                    {`Players: ${formatNumber(snapshot.currentPlayers ?? null)} · Review score: ${snapshot.reviewScore ? `${snapshot.reviewScore.toFixed(1)}%` : "N/A"}`}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No raw snapshots available yet.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
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

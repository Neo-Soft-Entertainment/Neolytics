"use client";

import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { ExportActions } from "@/components/export/export-actions";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/features/dashboard/hooks";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function DashboardClient() {
  const query = useDashboard();

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading dashboard...</p>;
  }

  if (query.isError) {
    return <ErrorState title="Dashboard unavailable" description="We could not load dashboard data." />;
  }

  const data = query.data;

  if (!data) {
    return (
      <EmptyState
        title="Catalog is still warming up"
        description="Neolytics is ready, but the Steam dataset has not been populated in this environment yet."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/70 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_30%),radial-gradient(circle_at_left,_rgba(59,130,246,0.12),_transparent_35%)]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                A working view of market coverage, tracked games, recent launches, and estimated leaders across Steam.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/games">Browse games</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/opportunities">Open opportunities</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/compare">Compare games</Link>
              </Button>
              <ExportActions
                label="Export report"
                xlsxHref="/api/exports/dashboard?format=xlsx"
                csvHref="/api/exports/dashboard?format=csv"
                googleSheetsEndpoint="/api/exports/dashboard"
              />
            </div>
          </div>
          <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/70 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Catalog coverage</span>
              <span className="font-medium">{formatNumber(data.marketOverview.totalGames)} games</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Tracked in workspace</span>
              <span className="font-medium">{formatNumber(data.marketOverview.trackedGamesCount)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Recent launches surfaced</span>
              <span className="font-medium">{formatNumber(data.recentLaunches.length)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Catalog games" value={formatNumber(data.marketOverview.totalGames)} />
        <KpiCard
          label="Average review score"
          value={`${data.marketOverview.averageReviewScore.toFixed(1)}%`}
        />
        <KpiCard label="Saved games" value={formatNumber(data.marketOverview.trackedGamesCount)} />
        <KpiCard label="Recent launches" value={formatNumber(data.recentLaunches.length)} />
      </div>
      {data.portfolioReadiness ? (
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard label="Portfolio opportunity" value={formatNumber(data.portfolioReadiness.averageOpportunityScore)} />
          <KpiCard label="Portfolio risk" value={formatNumber(data.portfolioReadiness.averageRiskScore)} />
          <KpiCard label="Portfolio fit" value={formatNumber(data.portfolioReadiness.averageFitScore)} />
          <KpiCard label="Analyzed theses" value={formatNumber(data.projectSignals.length)} />
        </div>
      ) : null}
      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle>Guided journey</CardTitle>
            <p className="text-sm text-muted-foreground">
              {data.guidedJourney.completedSteps} of {data.guidedJourney.totalSteps} product milestones completed.
            </p>
          </div>
          <div className="space-y-2 lg:text-right">
            <p className="text-2xl font-semibold">{data.guidedJourney.progressPercent}%</p>
            {data.guidedJourney.nextStep ? (
              <Button asChild size="sm">
                <Link href={data.guidedJourney.nextStep.href}>
                  Continue: {data.guidedJourney.nextStep.title}
                </Link>
              </Button>
            ) : (
              <Badge variant="secondary">Journey complete</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {data.guidedJourney.steps.map((step) => (
            <div key={step.id} className="rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
                <Badge variant={step.completed ? "default" : "secondary"}>
                  {step.completed ? "Done" : "Next"}
                </Badge>
              </div>
              {!step.completed ? (
                <div className="mt-3">
                  <Button asChild size="sm" variant="outline">
                    <Link href={step.href}>Open step</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project intelligence board</CardTitle>
          </CardHeader>
          <CardContent>
            {data.projectSignals.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Run market analysis on at least one project to start building a thesis-level board across your portfolio.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/projects">Open projects</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Opportunity</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Fit</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.projectSignals.map((item) => (
                    <TableRow key={item.projectId}>
                      <TableCell>
                        <Link className="font-medium hover:underline" href={`/projects/${item.projectId}`}>
                          {item.projectName}
                        </Link>
                      </TableCell>
                      <TableCell>{formatNumber(item.opportunityScore)}</TableCell>
                      <TableCell>{formatNumber(item.riskScore)}</TableCell>
                      <TableCell>{formatNumber(item.fitScore)}</TableCell>
                      <TableCell>{formatNumber(item.confidenceScore)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tracked games</CardTitle>
          </CardHeader>
          <CardContent>
            {data.trackedGames.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No games saved to the current workspace yet. Start with a shortlist, then use compare and reports from there.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/games">Build a shortlist</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game</TableHead>
                    <TableHead>Reviews</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.trackedGames.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link className="font-medium hover:underline" href={`/games/${item.steamGame.appId}`}>
                          {item.steamGame.name}
                        </Link>
                      </TableCell>
                      <TableCell>{formatNumber(item.steamGame.reviewCount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent launches</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Release date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentLaunches.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell>
                      <Link className="font-medium hover:underline" href={`/games/${game.appId}`}>
                        {game.name}
                      </Link>
                    </TableCell>
                    <TableCell>{game.releaseDate ? new Date(game.releaseDate).toLocaleDateString() : "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      {data.portfolioReadiness?.topThesis ? (
        <Card>
          <CardHeader>
            <CardTitle>Top current thesis</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-lg font-semibold">{data.portfolioReadiness.topThesis.projectName}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Stage: {data.portfolioReadiness.topThesis.stage.replaceAll("_", " ")} · Opportunity {formatNumber(data.portfolioReadiness.topThesis.opportunityScore)} · Fit {formatNumber(data.portfolioReadiness.topThesis.fitScore)}
              </p>
            </div>
            <Button asChild>
              <Link href={`/projects/${data.portfolioReadiness.topThesis.projectId}`}>Open thesis</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top estimated revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Estimated net revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topRevenue.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link className="font-medium hover:underline" href={`/games/${item.steamGame.appId}`}>
                        {item.steamGame.name}
                      </Link>
                    </TableCell>
                    <TableCell>{formatCurrency(item.medianNetRevenueCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fastest growing by reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Total reviews</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.fastestGrowing.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell>
                      <Link className="font-medium hover:underline" href={`/games/${game.appId}`}>
                        {game.name}
                      </Link>
                    </TableCell>
                    <TableCell>{formatNumber(game.reviewCount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

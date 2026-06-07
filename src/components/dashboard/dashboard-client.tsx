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
      <Card className="aurora-panel overflow-hidden border-white/10 shadow-[0_30px_80px_rgba(14,165,233,0.12)]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="animate-rise-in space-y-4">
            <div>
              <h1 className="text-3xl font-bold tracking-[-0.05em] sm:text-4xl">Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                A working view of market coverage, tracked games, recent launches, and estimated leaders across Steam.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary">{data.planLabel} plan</Badge>
              <Button asChild>
                <Link href="/games">Browse games</Link>
              </Button>
              {data.canAccessFinanceWorkspace ? (
                <Button asChild variant="outline">
                  <Link href="/finance">Open finance</Link>
                </Button>
              ) : null}
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
          <div className="animate-rise-in-delay grid gap-3 rounded-[1.5rem] border border-white/10 bg-background/70 p-4 text-sm backdrop-blur-xl">
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
            <div className="rounded-2xl border border-white/10 bg-white/35 p-3 dark:bg-white/[0.04]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Live operating mode</p>
              <p className="mt-2 font-medium">Move from market thesis to studio execution without leaving the workspace.</p>
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
      {data.canAccessFinanceWorkspace ? (
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard label="Net cash" value={formatCurrency(data.financeSnapshot.netCashCents)} />
          <KpiCard label="Pending receivables" value={formatCurrency(data.financeSnapshot.pendingRevenueCents)} />
          <KpiCard label="Pending payables" value={formatCurrency(data.financeSnapshot.pendingExpenseCents)} />
          <KpiCard label="Active budgets" value={formatNumber(data.financeSnapshot.activeBudgetsCount)} />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardContent className="flex flex-col gap-3 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-medium">Finance workspace unlocks on Plus</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upgrade when you are ready to run budgets, payables, invoices, and company operations inside the same ERP.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/settings">Review plans</Link>
            </Button>
          </CardContent>
        </Card>
      )}
      {data.portfolioReadiness ? (
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard label="Portfolio opportunity" value={formatNumber(data.portfolioReadiness.averageOpportunityScore)} />
          <KpiCard label="Portfolio risk" value={formatNumber(data.portfolioReadiness.averageRiskScore)} />
          <KpiCard label="Portfolio fit" value={formatNumber(data.portfolioReadiness.averageFitScore)} />
          <KpiCard label="Analyzed theses" value={formatNumber(data.projectSignals.length)} />
        </div>
      ) : null}
      <Card className="overflow-hidden">
        <div className="pointer-events-none h-px w-full shimmer-divider opacity-70" />
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle>Guided journey</CardTitle>
            <p className="text-sm text-muted-foreground">
              {data.guidedJourney.completedSteps} of {data.guidedJourney.totalSteps} product milestones completed.
            </p>
          </div>
          <div className="space-y-2 lg:text-right">
            <Badge variant="secondary">{data.guidedJourney.tierLabel}</Badge>
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
            <div key={step.id} className="rounded-2xl border border-white/10 bg-white/55 p-4 backdrop-blur dark:bg-white/[0.03]">
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
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
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
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
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
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
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
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
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
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
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
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
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

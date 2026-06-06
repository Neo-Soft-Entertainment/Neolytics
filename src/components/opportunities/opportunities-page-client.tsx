"use client";

import Link from "next/link";

import { ExportActions } from "@/components/export/export-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOpportunities } from "@/features/opportunities/hooks";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function OpportunitiesPageClient() {
  const query = useOpportunities();

  return (
    <div className="space-y-6">
      <Card className="aurora-panel overflow-hidden border-white/10 shadow-[0_30px_80px_rgba(14,165,233,0.1)]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Opportunities</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Ranked opportunities based on revenue, review quality, release momentum, pricing, and competitive pressure.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-white/10 bg-white/55 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
                Ranked market scan
              </span>
              <span className="rounded-full border border-white/10 bg-white/55 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
                Revenue + risk + confidence
              </span>
            </div>
          </div>
          <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-background/70 p-4 text-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Candidates</span>
              <span className="font-medium">{query.data?.length ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Top opportunity</span>
              <span className="font-medium">{query.data?.[0] ? formatNumber(query.data[0].score) : "N/A"}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/35 p-3 dark:bg-white/[0.04]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Reading mode</p>
              <p className="mt-2 font-medium">Treat this as a ranked shortlist, then open compare, game detail, and project analysis before committing to a thesis.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Opportunity finder</CardTitle>
          <ExportActions
            label="Export opportunities"
            xlsxHref="/api/exports/opportunities?format=xlsx"
            csvHref="/api/exports/opportunities?format=csv"
            googleSheetsEndpoint="/api/exports/opportunities"
          />
        </CardHeader>
        <CardContent>
          {query.data && query.data.length > 0 ? (
            <div className="mb-4 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Top opportunity</p>
                <p className="mt-2 text-2xl font-semibold">{formatNumber(query.data[0]?.score ?? null)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Top confidence</p>
                <p className="mt-2 text-2xl font-semibold">{formatNumber(query.data[0]?.confidenceScore ?? null)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Median candidate risk</p>
                <p className="mt-2 text-2xl font-semibold">{formatNumber(query.data[Math.floor(query.data.length / 2)]?.riskScore ?? null)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Best market size</p>
                <p className="mt-2 text-2xl font-semibold">{query.data[0]?.marketSizeLabel ?? "N/A"}</p>
              </div>
            </div>
          ) : null}
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading ranked opportunities...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Opportunity score</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Revenue potential</TableHead>
                  <TableHead>Review score</TableHead>
                  <TableHead>Competition</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Median net revenue</TableHead>
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
                        {item.marketSizeLabel} market · {item.premiumSharePercent}% premium
                      </p>
                    </TableCell>
                    <TableCell>{item.score}</TableCell>
                    <TableCell>{item.riskScore}</TableCell>
                    <TableCell>{item.revenuePotentialScore}</TableCell>
                    <TableCell>{item.reviewScore ? `${item.reviewScore.toFixed(1)}%` : "N/A"}</TableCell>
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

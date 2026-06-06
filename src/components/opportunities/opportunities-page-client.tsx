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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Opportunities</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ranked opportunities based on revenue, review quality, release momentum, pricing, and competition.
        </p>
      </div>
      <Card>
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
              <div className="rounded-2xl border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Top opportunity</p>
                <p className="mt-2 text-2xl font-semibold">{formatNumber(query.data[0]?.score ?? null)}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Top confidence</p>
                <p className="mt-2 text-2xl font-semibold">{formatNumber(query.data[0]?.confidenceScore ?? null)}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Median candidate risk</p>
                <p className="mt-2 text-2xl font-semibold">{formatNumber(query.data[Math.floor(query.data.length / 2)]?.riskScore ?? null)}</p>
              </div>
              <div className="rounded-2xl border p-4">
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

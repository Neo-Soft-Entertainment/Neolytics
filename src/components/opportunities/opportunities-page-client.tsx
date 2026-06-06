"use client";

import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOpportunities } from "@/features/opportunities/hooks";
import { formatCurrency } from "@/lib/utils";

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
        <CardHeader>
          <CardTitle>Opportunity finder</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading ranked opportunities...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Opportunity score</TableHead>
                  <TableHead>Review score</TableHead>
                  <TableHead>Competition</TableHead>
                  <TableHead>Median net revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.map((item: any) => (
                  <TableRow key={item.appId}>
                    <TableCell>
                      <Link className="font-medium hover:underline" href={`/games/${item.appId}`}>
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell>{item.score}</TableCell>
                    <TableCell>{item.reviewScore ? `${item.reviewScore.toFixed(1)}%` : "N/A"}</TableCell>
                    <TableCell>{item.competitionCount}</TableCell>
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

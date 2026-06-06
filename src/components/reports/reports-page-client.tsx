"use client";

import { useState } from "react";

import { ExportActions } from "@/components/export/export-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCreateReport, useReports } from "@/features/reports/hooks";

export function ReportsPageClient() {
  const reportsQuery = useReports();
  const createReport = useCreateReport();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [tag, setTag] = useState("");

  async function handleCreateReport() {
    if (!title.trim()) {
      return;
    }

    setError(null);

    try {
      await createReport.mutateAsync({
        title,
        genre: genre || undefined,
        tag: tag || undefined
      });
      setTitle("");
      setGenre("");
      setTag("");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to generate report.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a basic market report from the current Steam dataset and keep the output in your organization.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Generate report</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="genre">Genre slug</Label>
            <Input id="genre" value={genre} onChange={(event) => setGenre(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag">Tag slug</Label>
            <Input id="tag" value={tag} onChange={(event) => setTag(event.target.value)} />
          </div>
          <div className="md:col-span-3">
            <Button onClick={handleCreateReport} disabled={createReport.isPending}>
              {createReport.isPending ? "Generating..." : "Generate report"}
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive md:col-span-3">{error}</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Generated reports</CardTitle>
        </CardHeader>
        <CardContent>
          {reportsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading reports...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Export</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportsQuery.data?.map((report: any) => (
                  <TableRow key={report.id}>
                    <TableCell>{report.title}</TableCell>
                    <TableCell>{report.reportType}</TableCell>
                    <TableCell>{report.status}</TableCell>
                    <TableCell>{new Date(report.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <ExportActions
                        label="Export"
                        xlsxHref={`/api/exports/reports/${report.id}?format=xlsx`}
                        csvHref={`/api/exports/reports/${report.id}?format=csv`}
                        googleSheetsEndpoint={`/api/exports/reports/${report.id}`}
                      />
                    </TableCell>
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

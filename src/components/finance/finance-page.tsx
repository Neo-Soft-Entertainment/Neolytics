"use client";

import { BudgetStatus, ExpenseCategory, FinanceEntryStatus, RevenueSourceType } from "@prisma/client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ExportActions } from "@/components/export/export-actions";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatNumber } from "@/lib/utils";

const budgetStatuses = Object.values(BudgetStatus);
const financeStatuses = Object.values(FinanceEntryStatus);
const revenueSourceTypes = Object.values(RevenueSourceType);
const expenseCategories = Object.values(ExpenseCategory);

function formatDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

export function FinancePage({
  organizationName,
  canManage,
  data
}: {
  organizationName: string;
  canManage: boolean;
  data: {
    projects: Array<{ id: string; name: string; stage: string }>;
    budgets: Array<{
      id: string;
      projectId: string | null;
      name: string;
      status: BudgetStatus;
      currencyCode: string;
      startsAt: string | null;
      endsAt: string | null;
      totalPlannedCents: number;
      notes: string | null;
      project: { id: string; name: string } | null;
      lines: Array<{
        id: string;
        category: string;
        description: string;
        vendorName: string | null;
        plannedCents: number;
        actualCents: number;
        dueAt: string | null;
        paidAt: string | null;
      }>;
    }>;
    revenueEntries: Array<{
      id: string;
      projectId: string | null;
      sourceType: RevenueSourceType;
      sourceName: string;
      status: FinanceEntryStatus;
      grossCents: number;
      netCents: number;
      currencyCode: string;
      receivedAt: string;
      notes: string | null;
      project: { id: string; name: string } | null;
    }>;
    expenseEntries: Array<{
      id: string;
      projectId: string | null;
      category: ExpenseCategory;
      vendorName: string;
      status: FinanceEntryStatus;
      amountCents: number;
      currencyCode: string;
      occurredAt: string;
      dueAt: string | null;
      paidAt: string | null;
      notes: string | null;
      project: { id: string; name: string } | null;
    }>;
    summary: {
      activeBudgetsCount: number;
      totalBudgetPlannedCents: number;
      totalBudgetActualCents: number;
      totalRevenueNetCents: number;
      totalExpensesPaidCents: number;
      pendingRevenueCents: number;
      pendingExpenseCents: number;
      netCashCents: number;
    };
    cashflow: Array<{
      month: string;
      inflowCents: number;
      outflowCents: number;
      netCents: number;
    }>;
    projectSnapshots: Array<{
      projectId: string;
      projectName: string;
      stage: string;
      budgetPlannedCents: number;
      budgetActualCents: number;
      revenueNetCents: number;
      expensesPaidCents: number;
      netCents: number;
    }>;
  };
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitJson(url: string, body: Record<string, unknown>, successMessage: string) {
    setMessage(null);
    setError(null);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setError(payload?.message ?? "Unable to save finance data.");
      return;
    }

    setMessage(successMessage);
    router.refresh();
  }

  async function patchJson(url: string, body: Record<string, unknown>, successMessage: string) {
    setMessage(null);
    setError(null);

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setError(payload?.message ?? "Unable to update finance data.");
      return;
    }

    setMessage(successMessage);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/70 bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.12),_transparent_28%),radial-gradient(circle_at_left,_rgba(59,130,246,0.12),_transparent_32%)]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Finance</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Run the commercial layer of {organizationName}: budgets, project spending, receipts, and a working cash view tied back to the game portfolio.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ExportActions
                label="Export finance"
                xlsxHref="/api/exports/finance?format=xlsx"
                csvHref="/api/exports/finance?format=csv"
                googleSheetsEndpoint="/api/exports/finance"
              />
            </div>
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/70 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Net cash position</span>
              <span className="font-medium">{formatCurrency(data.summary.netCashCents)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Pending receivables</span>
              <span className="font-medium">{formatCurrency(data.summary.pendingRevenueCents)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Pending payables</span>
              <span className="font-medium">{formatCurrency(data.summary.pendingExpenseCents)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Active budgets" value={formatNumber(data.summary.activeBudgetsCount)} />
        <KpiCard label="Planned budget" value={formatCurrency(data.summary.totalBudgetPlannedCents)} />
        <KpiCard label="Revenue received" value={formatCurrency(data.summary.totalRevenueNetCents)} />
        <KpiCard label="Expenses paid" value={formatCurrency(data.summary.totalExpensesPaidCents)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Cash flow</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.cashflow}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: "#111827" }}
                />
                <Bar dataKey="inflowCents" fill="#10b981" name="Inflow" radius={[6, 6, 0, 0]} />
                <Bar dataKey="outflowCents" fill="#ef4444" name="Outflow" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Project P&amp;L snapshots</CardTitle>
          </CardHeader>
          <CardContent>
            {data.projectSnapshots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No project-linked financial entries yet. Start with a budget, then connect revenue and expenses to projects.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Expenses</TableHead>
                    <TableHead>Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.projectSnapshots.map((item) => (
                    <TableRow key={item.projectId}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{item.projectName}</p>
                          <p className="text-xs text-muted-foreground">{item.stage.replaceAll("_", " ")}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(item.revenueNetCents)}</TableCell>
                      <TableCell>{formatCurrency(item.expensesPaidCents)}</TableCell>
                      <TableCell>{formatCurrency(item.netCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Create budget</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                void submitJson("/api/finance/budgets", {
                  projectId: formData.get("projectId") || undefined,
                  name: formData.get("name"),
                  status: formData.get("status"),
                  currencyCode: formData.get("currencyCode"),
                  startsAt: formData.get("startsAt") || undefined,
                  endsAt: formData.get("endsAt") || undefined,
                  notes: formData.get("notes")
                }, "Budget created.");
              }}
            >
              <div className="space-y-2">
                <Label>Budget name</Label>
                <Input disabled={!canManage} name="name" placeholder="Vertical Slice Budget" />
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="projectId" defaultValue="">
                  <option value="">Organization-wide</option>
                  {data.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="status" defaultValue={BudgetStatus.DRAFT}>
                    {budgetStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input defaultValue="USD" disabled={!canManage} maxLength={3} name="currencyCode" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Starts at</Label>
                  <Input disabled={!canManage} name="startsAt" type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Ends at</Label>
                  <Input disabled={!canManage} name="endsAt" type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea disabled={!canManage} name="notes" placeholder="Scope, staffing assumptions, target runway..." />
              </div>
              <Button disabled={!canManage} type="submit">Create budget</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Record revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                void submitJson("/api/finance/revenue", {
                  projectId: formData.get("projectId") || undefined,
                  sourceType: formData.get("sourceType"),
                  sourceName: formData.get("sourceName"),
                  status: formData.get("status"),
                  grossCents: Number(formData.get("grossCents") || 0),
                  netCents: Number(formData.get("netCents") || 0),
                  currencyCode: formData.get("currencyCode"),
                  receivedAt: formData.get("receivedAt"),
                  notes: formData.get("notes")
                }, "Revenue entry created.");
              }}
            >
              <div className="space-y-2">
                <Label>Source</Label>
                <Input disabled={!canManage} name="sourceName" placeholder="Steam May payout" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="sourceType" defaultValue={RevenueSourceType.STEAM}>
                    {revenueSourceTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="status" defaultValue={FinanceEntryStatus.RECEIVED}>
                    {financeStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Gross cents</Label>
                  <Input disabled={!canManage} name="grossCents" placeholder="1250000" type="number" />
                </div>
                <div className="space-y-2">
                  <Label>Net cents</Label>
                  <Input disabled={!canManage} name="netCents" placeholder="875000" type="number" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="projectId" defaultValue="">
                    <option value="">Organization-wide</option>
                    {data.projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Received at</Label>
                  <Input disabled={!canManage} name="receivedAt" type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea disabled={!canManage} name="notes" placeholder="Steam, publisher recoup, grant tranche..." />
              </div>
              <Button disabled={!canManage} type="submit">Create revenue entry</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Record expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                void submitJson("/api/finance/expenses", {
                  projectId: formData.get("projectId") || undefined,
                  category: formData.get("category"),
                  vendorName: formData.get("vendorName"),
                  status: formData.get("status"),
                  amountCents: Number(formData.get("amountCents") || 0),
                  currencyCode: formData.get("currencyCode"),
                  occurredAt: formData.get("occurredAt"),
                  dueAt: formData.get("dueAt") || undefined,
                  paidAt: formData.get("paidAt") || undefined,
                  notes: formData.get("notes")
                }, "Expense entry created.");
              }}
            >
              <div className="space-y-2">
                <Label>Vendor / payee</Label>
                <Input disabled={!canManage} name="vendorName" placeholder="Contract artist" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="category" defaultValue={ExpenseCategory.CONTRACTOR}>
                    {expenseCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="status" defaultValue={FinanceEntryStatus.PENDING}>
                    {financeStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Amount cents</Label>
                  <Input disabled={!canManage} name="amountCents" placeholder="250000" type="number" />
                </div>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="projectId" defaultValue="">
                    <option value="">Organization-wide</option>
                    {data.projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Occurred at</Label>
                  <Input disabled={!canManage} name="occurredAt" type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Due at</Label>
                  <Input disabled={!canManage} name="dueAt" type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Paid at</Label>
                  <Input disabled={!canManage} name="paidAt" type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea disabled={!canManage} name="notes" placeholder="Milestone payout, legal bill, software annual plan..." />
              </div>
              <Button disabled={!canManage} type="submit">Create expense entry</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budgets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.budgets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No budgets yet.</p>
          ) : (
            data.budgets.map((budget) => (
              <div key={budget.id} className="rounded-2xl border p-4">
                <form
                  className="grid gap-4 xl:grid-cols-6"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    void patchJson(`/api/finance/budgets/${budget.id}`, {
                      projectId: formData.get("projectId") || undefined,
                      name: formData.get("name"),
                      status: formData.get("status"),
                      currencyCode: formData.get("currencyCode"),
                      startsAt: formData.get("startsAt") || undefined,
                      endsAt: formData.get("endsAt") || undefined,
                      notes: formData.get("notes")
                    }, "Budget updated.");
                  }}
                >
                  <div className="space-y-2 xl:col-span-2">
                    <Label>Name</Label>
                    <Input defaultValue={budget.name} disabled={!canManage} name="name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={budget.projectId ?? ""} disabled={!canManage} name="projectId">
                      <option value="">Organization-wide</option>
                      {data.projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={budget.status} disabled={!canManage} name="status">
                      {budgetStatuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Starts at</Label>
                    <Input defaultValue={formatDateInput(budget.startsAt)} disabled={!canManage} name="startsAt" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ends at</Label>
                    <Input defaultValue={formatDateInput(budget.endsAt)} disabled={!canManage} name="endsAt" type="date" />
                  </div>
                  <div className="space-y-2 xl:col-span-2">
                    <Label>Notes</Label>
                    <Textarea defaultValue={budget.notes ?? ""} disabled={!canManage} name="notes" />
                  </div>
                  <div className="flex items-end">
                    <Button disabled={!canManage} type="submit">Save budget</Button>
                  </div>
                  <div className="flex items-end justify-end xl:col-span-3">
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="secondary">Planned {formatCurrency(budget.totalPlannedCents)}</Badge>
                      <Badge variant="secondary">
                        Actual {formatCurrency(budget.lines.reduce((sum, line) => sum + line.actualCents, 0))}
                      </Badge>
                    </div>
                  </div>
                </form>

                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Planned</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Save</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budget.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell colSpan={7} className="p-0">
                            <form
                              className="grid gap-3 p-3 md:grid-cols-[1fr_2fr_repeat(2,minmax(110px,140px))_120px_120px_100px]"
                              onSubmit={(event) => {
                                event.preventDefault();
                                const formData = new FormData(event.currentTarget);
                                void patchJson(`/api/finance/budget-lines/${line.id}`, {
                                  category: formData.get("category"),
                                  description: formData.get("description"),
                                  vendorName: formData.get("vendorName"),
                                  plannedCents: Number(formData.get("plannedCents") || 0),
                                  actualCents: Number(formData.get("actualCents") || 0),
                                  dueAt: formData.get("dueAt") || undefined,
                                  paidAt: formData.get("paidAt") || undefined
                                }, "Budget line updated.");
                              }}
                            >
                              <Input defaultValue={line.category} disabled={!canManage} name="category" />
                              <div className="space-y-2">
                                <Input defaultValue={line.description} disabled={!canManage} name="description" />
                                <Input defaultValue={line.vendorName ?? ""} disabled={!canManage} name="vendorName" placeholder="Vendor" />
                              </div>
                              <Input defaultValue={line.plannedCents} disabled={!canManage} name="plannedCents" type="number" />
                              <Input defaultValue={line.actualCents} disabled={!canManage} name="actualCents" type="number" />
                              <Input defaultValue={formatDateInput(line.dueAt)} disabled={!canManage} name="dueAt" type="date" />
                              <Input defaultValue={formatDateInput(line.paidAt)} disabled={!canManage} name="paidAt" type="date" />
                              <Button disabled={!canManage} size="sm" type="submit">Save</Button>
                            </form>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={7} className="p-0">
                          <form
                            className="grid gap-3 border-t p-3 md:grid-cols-[1fr_2fr_repeat(2,minmax(110px,140px))_120px_120px_100px]"
                            onSubmit={(event) => {
                              event.preventDefault();
                              const formData = new FormData(event.currentTarget);
                              void submitJson(`/api/finance/budgets/${budget.id}/lines`, {
                                category: formData.get("category"),
                                description: formData.get("description"),
                                vendorName: formData.get("vendorName"),
                                plannedCents: Number(formData.get("plannedCents") || 0),
                                actualCents: Number(formData.get("actualCents") || 0),
                                dueAt: formData.get("dueAt") || undefined,
                                paidAt: formData.get("paidAt") || undefined
                              }, "Budget line created.");
                            }}
                          >
                            <Input disabled={!canManage} name="category" placeholder="Category" />
                            <div className="space-y-2">
                              <Input disabled={!canManage} name="description" placeholder="Description" />
                              <Input disabled={!canManage} name="vendorName" placeholder="Vendor" />
                            </div>
                            <Input defaultValue={0} disabled={!canManage} name="plannedCents" type="number" />
                            <Input defaultValue={0} disabled={!canManage} name="actualCents" type="number" />
                            <Input disabled={!canManage} name="dueAt" type="date" />
                            <Input disabled={!canManage} name="paidAt" type="date" />
                            <Button disabled={!canManage} size="sm" type="submit">Add line</Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue ledger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.revenueEntries.map((entry) => (
              <form
                key={entry.id}
                className="rounded-2xl border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  void patchJson(`/api/finance/revenue/${entry.id}`, {
                    projectId: formData.get("projectId") || undefined,
                    sourceType: formData.get("sourceType"),
                    sourceName: formData.get("sourceName"),
                    status: formData.get("status"),
                    grossCents: Number(formData.get("grossCents") || 0),
                    netCents: Number(formData.get("netCents") || 0),
                    currencyCode: formData.get("currencyCode"),
                    receivedAt: formData.get("receivedAt"),
                    notes: formData.get("notes")
                  }, "Revenue entry updated.");
                }}
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Input defaultValue={entry.sourceName} disabled={!canManage} name="sourceName" />
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={entry.sourceType} disabled={!canManage} name="sourceType">
                    {revenueSourceTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={entry.status} disabled={!canManage} name="status">
                    {financeStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={entry.projectId ?? ""} disabled={!canManage} name="projectId">
                    <option value="">Organization-wide</option>
                    {data.projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                  <Input defaultValue={entry.grossCents} disabled={!canManage} name="grossCents" type="number" />
                  <Input defaultValue={entry.netCents} disabled={!canManage} name="netCents" type="number" />
                  <Input defaultValue={entry.currencyCode} disabled={!canManage} maxLength={3} name="currencyCode" />
                  <Input defaultValue={formatDateInput(entry.receivedAt)} disabled={!canManage} name="receivedAt" type="date" />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_100px]">
                  <Textarea defaultValue={entry.notes ?? ""} disabled={!canManage} name="notes" placeholder="Notes" />
                  <Button disabled={!canManage} type="submit">Save</Button>
                </div>
              </form>
            ))}
            {data.revenueEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No revenue entries yet.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense ledger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.expenseEntries.map((entry) => (
              <form
                key={entry.id}
                className="rounded-2xl border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  void patchJson(`/api/finance/expenses/${entry.id}`, {
                    projectId: formData.get("projectId") || undefined,
                    category: formData.get("category"),
                    vendorName: formData.get("vendorName"),
                    status: formData.get("status"),
                    amountCents: Number(formData.get("amountCents") || 0),
                    currencyCode: formData.get("currencyCode"),
                    occurredAt: formData.get("occurredAt"),
                    dueAt: formData.get("dueAt") || undefined,
                    paidAt: formData.get("paidAt") || undefined,
                    notes: formData.get("notes")
                  }, "Expense entry updated.");
                }}
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Input defaultValue={entry.vendorName} disabled={!canManage} name="vendorName" />
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={entry.category} disabled={!canManage} name="category">
                    {expenseCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={entry.status} disabled={!canManage} name="status">
                    {financeStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={entry.projectId ?? ""} disabled={!canManage} name="projectId">
                    <option value="">Organization-wide</option>
                    {data.projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                  <Input defaultValue={entry.amountCents} disabled={!canManage} name="amountCents" type="number" />
                  <Input defaultValue={entry.currencyCode} disabled={!canManage} maxLength={3} name="currencyCode" />
                  <Input defaultValue={formatDateInput(entry.occurredAt)} disabled={!canManage} name="occurredAt" type="date" />
                  <Input defaultValue={formatDateInput(entry.dueAt)} disabled={!canManage} name="dueAt" type="date" />
                  <Input defaultValue={formatDateInput(entry.paidAt)} disabled={!canManage} name="paidAt" type="date" />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_100px]">
                  <Textarea defaultValue={entry.notes ?? ""} disabled={!canManage} name="notes" placeholder="Notes" />
                  <Button disabled={!canManage} type="submit">Save</Button>
                </div>
              </form>
            ))}
            {data.expenseEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expense entries yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

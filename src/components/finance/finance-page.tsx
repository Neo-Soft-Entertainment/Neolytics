"use client";

import {
  ApprovalStatus,
  BudgetStatus,
  ContractCounterpartyType,
  ContractStatus,
  ExpenseCategory,
  FinanceEntryStatus,
  InvoiceStatus,
  PayablePaymentType,
  PayableTitleStatus,
  RevenueSourceType,
  RoyaltyStatus
} from "@prisma/client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AccountsPayableSection } from "@/components/finance/accounts-payable-section";
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
const contractStatuses = Object.values(ContractStatus);
const contractCounterpartyTypes = Object.values(ContractCounterpartyType);
const royaltyStatuses = Object.values(RoyaltyStatus);
const invoiceStatuses = Object.values(InvoiceStatus);

function formatDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

export function FinancePage({
  canAccessApprovalsAudit,
  canAccessContractsRoyalties,
  canAccessFinanceWorkspace,
  canAccessInvoiceOps,
  organizationName,
  planLabel,
  canManage,
  data
}: {
  canAccessApprovalsAudit: boolean;
  canAccessContractsRoyalties: boolean;
  canAccessFinanceWorkspace: boolean;
  canAccessInvoiceOps: boolean;
  organizationName: string;
  planLabel: string;
  canManage: boolean;
  data: {
    projects: Array<{ id: string; name: string; stage: string }>;
    costCenters: Array<{
      id: string;
      code: string;
      name: string;
      active: boolean;
    }>;
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
    payableTitles: Array<{
      id: string;
      projectId: string | null;
      costCenterId: string;
      prefix: string;
      titleNumber: string;
      documentType: string;
      natureDescription: string;
      supplierIdentifier: string;
      supplierName: string;
      issueDate: string;
      dueDate: string;
      actualDueDate: string;
      titleAmountCents: number;
      additionalAmountCents: number;
      totalAmountCents: number;
      paidAmountCents: number;
      currencyCode: string;
      status: PayableTitleStatus;
      notes: string | null;
      project: { id: string; name: string } | null;
      costCenter: { id: string; code: string; name: string };
      allocations: Array<{
        id: string;
        natureDescription: string;
        amountCents: number;
        costCenter: { id: string; code: string; name: string };
      }>;
      payments: Array<{
        id: string;
        paymentType: PayablePaymentType;
        bank: string | null;
        branch: string | null;
        account: string | null;
        paymentDate: string;
        history: string | null;
        fineCents: number;
        interestCents: number;
        amountPaidCents: number;
      }>;
    }>;
    contracts: Array<{
      id: string;
      projectId: string | null;
      title: string;
      counterpartyName: string;
      counterpartyType: ContractCounterpartyType;
      status: ContractStatus;
      currencyCode: string;
      totalValueCents: number | null;
      startsAt: string | null;
      endsAt: string | null;
      signedAt: string | null;
      autoRenews: boolean;
      notes: string | null;
      project: { id: string; name: string } | null;
    }>;
    royaltyAgreements: Array<{
      id: string;
      projectId: string | null;
      contractId: string | null;
      name: string;
      partnerName: string;
      status: RoyaltyStatus;
      basisPoints: number;
      recoupable: boolean;
      recoupCapCents: number | null;
      notes: string | null;
      project: { id: string; name: string } | null;
      contract: { id: string; title: string } | null;
    }>;
    royaltyStatements: Array<{
      id: string;
      projectId: string | null;
      royaltyAgreementId: string;
      periodLabel: string;
      grossRevenueCents: number;
      deductibleCents: number;
      netRevenueCents: number;
      royaltyDueCents: number;
      paidAt: string | null;
      notes: string | null;
      project: { id: string; name: string } | null;
      royaltyAgreement: { id: string; name: string; partnerName: string };
    }>;
    issuedInvoices: Array<{
      id: string;
      projectId: string | null;
      contractId: string | null;
      invoiceNumber: string;
      customerName: string;
      status: InvoiceStatus;
      amountCents: number;
      currencyCode: string;
      issuedAt: string | null;
      dueAt: string | null;
      paidAt: string | null;
      notes: string | null;
      project: { id: string; name: string } | null;
      contract: { id: string; title: string } | null;
    }>;
    receivedInvoices: Array<{
      id: string;
      projectId: string | null;
      contractId: string | null;
      invoiceNumber: string;
      vendorName: string;
      status: InvoiceStatus;
      amountCents: number;
      currencyCode: string;
      issuedAt: string | null;
      dueAt: string | null;
      paidAt: string | null;
      notes: string | null;
      project: { id: string; name: string } | null;
      contract: { id: string; title: string } | null;
    }>;
    approvalRequests: Array<{
      id: string;
      projectId: string | null;
      contractId: string | null;
      entityType: string;
      entityId: string;
      actionLabel: string;
      status: ApprovalStatus;
      amountCents: number | null;
      reason: string | null;
      decisionNotes: string | null;
      createdAt: string;
      decidedAt: string | null;
      project: { id: string; name: string } | null;
      contract: { id: string; title: string } | null;
      requestedBy: { id: string; name: string | null; email: string };
      decidedBy: { id: string; name: string | null; email: string } | null;
    }>;
    summary: {
      activeBudgetsCount: number;
      totalBudgetPlannedCents: number;
      totalBudgetActualCents: number;
      totalRevenueNetCents: number;
      totalExpensesPaidCents: number;
      pendingRevenueCents: number;
      pendingExpenseCents: number;
      payableOpenCents: number;
      overduePayablesCount: number;
      royaltiesDueCents: number;
      pendingApprovalsCount: number;
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
  } | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canAccessFinanceWorkspace || !data) {
    return (
      <div className="space-y-6">
        <Card className="aurora-panel overflow-hidden border-white/10 shadow-[0_30px_80px_rgba(14,165,233,0.1)]">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Finance</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Run budgets, revenue, expenses, contracts, invoices, payables, and approvals as one studio finance workspace.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="border-white/10 bg-white/55 backdrop-blur dark:bg-white/[0.05]">
                  ERP finance layer
                </Badge>
                <Badge variant="secondary" className="border-white/10 bg-white/55 backdrop-blur dark:bg-white/[0.05]">
                  Current plan: {planLabel}
                </Badge>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-amber-400/25 bg-amber-500/10 p-4 text-sm">
              <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300">Upgrade required</p>
              <p className="mt-2 font-medium text-foreground">Finance Workspace starts on Plus.</p>
              <p className="mt-2 text-muted-foreground">
                Upgrade to unlock budgets, revenue, expenses, and the operating finance layer for the studio.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  async function patchApproval(approvalRequestId: string, status: ApprovalStatus) {
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/finance/approvals/${approvalRequestId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status
      })
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setError(payload?.message ?? "Unable to update approval.");
      return;
    }

    setMessage(`Approval ${status.toLowerCase()}.`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="aurora-panel overflow-hidden border-white/10 shadow-[0_30px_80px_rgba(14,165,233,0.1)]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Finance</h1>
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
              <Badge variant="secondary" className="border-white/10 bg-white/55 backdrop-blur dark:bg-white/[0.05]">
                ERP finance layer
              </Badge>
            </div>
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-background/70 p-4 text-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Net cash position</span>
              <span className="font-medium">{formatCurrency(data.summary.netCashCents)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Pending receivables</span>
              <span className="font-medium">{formatCurrency(data.summary.pendingRevenueCents)}</span>
            </div>
            {canAccessInvoiceOps ? (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Pending payables</span>
                <span className="font-medium">{formatCurrency(data.summary.payableOpenCents)}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Invoice ops</span>
                <span className="font-medium">Pro</span>
              </div>
            )}
            <div className="rounded-2xl border border-white/10 bg-white/35 p-3 dark:bg-white/[0.04]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Live operating view</p>
              <p className="mt-2 font-medium">Keep project economics, contracts, royalties, invoices, and approvals in one operating ledger.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Active budgets" value={formatNumber(data.summary.activeBudgetsCount)} />
        <KpiCard label="Planned budget" value={formatCurrency(data.summary.totalBudgetPlannedCents)} />
        <KpiCard label="Revenue received" value={formatCurrency(data.summary.totalRevenueNetCents)} />
        <KpiCard label="Expenses paid" value={formatCurrency(data.summary.totalExpensesPaidCents)} />
        {canAccessInvoiceOps ? <KpiCard label="Payables open" value={formatCurrency(data.summary.payableOpenCents)} /> : null}
        {canAccessInvoiceOps ? <KpiCard label="Titles overdue" value={formatNumber(data.summary.overduePayablesCount)} /> : null}
      </div>

      {canAccessInvoiceOps ? (
        <AccountsPayableSection
          canManage={canManage}
          costCenters={data.costCenters}
          payableTitles={data.payableTitles}
          projects={data.projects}
          submitJson={submitJson}
          summary={{
            payableOpenCents: data.summary.payableOpenCents,
            overduePayablesCount: data.summary.overduePayablesCount
          }}
        />
      ) : (
        <Card className="overflow-hidden border-amber-400/20">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>Invoices & payables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Accounts payable, issued invoices, received invoices, and payment tracking start on Pro.</p>
            <p>Your current plan can still run budgets, revenue, expenses, and project finance snapshots.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
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
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
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
        <Card className="xl:col-span-1 overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
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

        <Card className="xl:col-span-1 overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
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

        <Card className="xl:col-span-1 overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
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

      <Card className="overflow-hidden">
        <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
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
          <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
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

          <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
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

      {canAccessContractsRoyalties ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>Contracts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                void submitJson("/api/finance/contracts", {
                  projectId: formData.get("projectId") || undefined,
                  title: formData.get("title"),
                  counterpartyName: formData.get("counterpartyName"),
                  counterpartyType: formData.get("counterpartyType"),
                  status: formData.get("status"),
                  currencyCode: formData.get("currencyCode"),
                  totalValueCents: Number(formData.get("totalValueCents") || 0),
                  startsAt: formData.get("startsAt") || undefined,
                  endsAt: formData.get("endsAt") || undefined,
                  signedAt: formData.get("signedAt") || undefined,
                  autoRenews: formData.get("autoRenews") === "on",
                  notes: formData.get("notes")
                }, "Contract created.");
              }}
            >
              <Input disabled={!canManage} name="title" placeholder="Publishing agreement" />
              <Input disabled={!canManage} name="counterpartyName" placeholder="Counterparty" />
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="counterpartyType" defaultValue={ContractCounterpartyType.PUBLISHER}>
                {contractCounterpartyTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="status" defaultValue={ContractStatus.DRAFT}>
                {contractStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="projectId" defaultValue="">
                <option value="">Organization-wide</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <Input defaultValue="USD" disabled={!canManage} name="currencyCode" />
              <Input disabled={!canManage} name="totalValueCents" placeholder="500000" type="number" />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input className="h-4 w-4" disabled={!canManage} name="autoRenews" type="checkbox" />
                Auto-renews
              </label>
              <Input disabled={!canManage} name="startsAt" type="date" />
              <Input disabled={!canManage} name="endsAt" type="date" />
              <Input disabled={!canManage} name="signedAt" type="date" />
              <Textarea className="md:col-span-2" disabled={!canManage} name="notes" placeholder="Commercial notes, recoup terms, deliverables..." />
              <Button className="md:col-span-2" disabled={!canManage} type="submit">Create contract</Button>
            </form>
            {data.contracts.map((contract) => (
              <form
                key={contract.id}
                className="rounded-2xl border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  void patchJson(`/api/finance/contracts/${contract.id}`, {
                    projectId: formData.get("projectId") || undefined,
                    title: formData.get("title"),
                    counterpartyName: formData.get("counterpartyName"),
                    counterpartyType: formData.get("counterpartyType"),
                    status: formData.get("status"),
                    currencyCode: formData.get("currencyCode"),
                    totalValueCents: Number(formData.get("totalValueCents") || 0),
                    startsAt: formData.get("startsAt") || undefined,
                    endsAt: formData.get("endsAt") || undefined,
                    signedAt: formData.get("signedAt") || undefined,
                    autoRenews: formData.get("autoRenews") === "on",
                    notes: formData.get("notes")
                  }, "Contract updated.");
                }}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <Input defaultValue={contract.title} disabled={!canManage} name="title" />
                  <Input defaultValue={contract.counterpartyName} disabled={!canManage} name="counterpartyName" />
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={contract.counterpartyType} disabled={!canManage} name="counterpartyType">
                    {contractCounterpartyTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={contract.status} disabled={!canManage} name="status">
                    {contractStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={contract.projectId ?? ""} disabled={!canManage} name="projectId">
                    <option value="">Organization-wide</option>
                    {data.projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                  <Input defaultValue={contract.totalValueCents ?? 0} disabled={!canManage} name="totalValueCents" type="number" />
                  <Input defaultValue={formatDateInput(contract.startsAt)} disabled={!canManage} name="startsAt" type="date" />
                  <Input defaultValue={formatDateInput(contract.endsAt)} disabled={!canManage} name="endsAt" type="date" />
                  <Input defaultValue={formatDateInput(contract.signedAt)} disabled={!canManage} name="signedAt" type="date" />
                  <Input defaultValue={contract.currencyCode} disabled={!canManage} name="currencyCode" />
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input className="h-4 w-4" defaultChecked={contract.autoRenews} disabled={!canManage} name="autoRenews" type="checkbox" />
                    Auto-renews
                  </label>
                  <Textarea className="md:col-span-2" defaultValue={contract.notes ?? ""} disabled={!canManage} name="notes" />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    {contract.project?.name ?? "No project"} · {formatCurrency(contract.totalValueCents ?? 0)}
                  </div>
                  <Button disabled={!canManage} type="submit">Save contract</Button>
                </div>
              </form>
            ))}
          </CardContent>
        </Card>

          <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>Royalties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                void submitJson("/api/finance/royalties", {
                  projectId: formData.get("projectId") || undefined,
                  contractId: formData.get("contractId") || undefined,
                  name: formData.get("name"),
                  partnerName: formData.get("partnerName"),
                  status: formData.get("status"),
                  basisPoints: Number(formData.get("basisPoints") || 0),
                  recoupable: formData.get("recoupable") === "on",
                  recoupCapCents: Number(formData.get("recoupCapCents") || 0),
                  notes: formData.get("notes")
                }, "Royalty agreement created.");
              }}
            >
              <Input disabled={!canManage} name="name" placeholder="Publisher rev share" />
              <Input disabled={!canManage} name="partnerName" placeholder="Partner" />
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="status" defaultValue={RoyaltyStatus.DRAFT}>
                {royaltyStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <Input disabled={!canManage} name="basisPoints" placeholder="2000 = 20%" type="number" />
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="projectId" defaultValue="">
                <option value="">Organization-wide</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="contractId" defaultValue="">
                <option value="">No linked contract</option>
                {data.contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>{contract.title}</option>
                ))}
              </select>
              <Input disabled={!canManage} name="recoupCapCents" placeholder="0" type="number" />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input className="h-4 w-4" disabled={!canManage} name="recoupable" type="checkbox" />
                Recoupable
              </label>
              <Textarea className="md:col-span-2" disabled={!canManage} name="notes" placeholder="Royalty notes" />
              <Button className="md:col-span-2" disabled={!canManage} type="submit">Create royalty agreement</Button>
            </form>
            <form
              className="grid gap-3 rounded-2xl border p-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                void submitJson("/api/finance/royalty-statements", {
                  projectId: formData.get("projectId") || undefined,
                  royaltyAgreementId: formData.get("royaltyAgreementId"),
                  periodLabel: formData.get("periodLabel"),
                  periodStart: formData.get("periodStart") || undefined,
                  periodEnd: formData.get("periodEnd") || undefined,
                  grossRevenueCents: Number(formData.get("grossRevenueCents") || 0),
                  deductibleCents: Number(formData.get("deductibleCents") || 0),
                  notes: formData.get("notes")
                }, "Royalty statement created.");
              }}
            >
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="royaltyAgreementId" defaultValue="">
                <option value="" disabled>Select agreement</option>
                {data.royaltyAgreements.map((agreement) => (
                  <option key={agreement.id} value={agreement.id}>{agreement.name}</option>
                ))}
              </select>
              <Input disabled={!canManage} name="periodLabel" placeholder="2026-Q2" />
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="projectId" defaultValue="">
                <option value="">Use agreement project</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <Input disabled={!canManage} name="grossRevenueCents" placeholder="900000" type="number" />
              <Input disabled={!canManage} name="deductibleCents" placeholder="100000" type="number" />
              <Input disabled={!canManage} name="periodStart" type="date" />
              <Input disabled={!canManage} name="periodEnd" type="date" />
              <Textarea className="md:col-span-2" disabled={!canManage} name="notes" placeholder="Statement notes" />
              <Button className="md:col-span-2" disabled={!canManage} type="submit">Create royalty statement</Button>
            </form>
            {data.royaltyStatements.map((statement) => (
              <div key={statement.id} className="rounded-2xl border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{statement.periodLabel} · {statement.royaltyAgreement.name}</p>
                    <p className="text-muted-foreground">{statement.project?.name ?? "No project"} · {statement.royaltyAgreement.partnerName}</p>
                  </div>
                  <Badge variant={statement.paidAt ? "default" : "secondary"}>
                    {statement.paidAt ? "Paid" : "Pending"}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <div>Gross {formatCurrency(statement.grossRevenueCents)}</div>
                  <div>Net {formatCurrency(statement.netRevenueCents)}</div>
                  <div>Royalty due {formatCurrency(statement.royaltyDueCents)}</div>
                  <div>{statement.paidAt ? `Paid ${new Date(statement.paidAt).toLocaleDateString()}` : "Awaiting payout"}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      ) : (
        <Card className="overflow-hidden border-amber-400/20">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>Contracts & royalties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Commercial agreements, recoup structures, royalty statements, and linked deal records are part of Pro.</p>
            <p>That keeps the deeper commercial operations layer distinct from the core finance workspace.</p>
          </CardContent>
        </Card>
      )}

      {canAccessInvoiceOps ? (
        <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>Issued invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                void submitJson("/api/finance/issued-invoices", {
                  projectId: formData.get("projectId") || undefined,
                  contractId: formData.get("contractId") || undefined,
                  invoiceNumber: formData.get("invoiceNumber"),
                  customerName: formData.get("customerName"),
                  status: formData.get("status"),
                  amountCents: Number(formData.get("amountCents") || 0),
                  currencyCode: formData.get("currencyCode"),
                  issuedAt: formData.get("issuedAt") || undefined,
                  dueAt: formData.get("dueAt") || undefined,
                  paidAt: formData.get("paidAt") || undefined,
                  notes: formData.get("notes")
                }, "Issued invoice created.");
              }}
            >
              <Input disabled={!canManage} name="invoiceNumber" placeholder="NF-2026-001" />
              <Input disabled={!canManage} name="customerName" placeholder="Customer" />
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="status" defaultValue={InvoiceStatus.ISSUED}>
                {invoiceStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <Input defaultValue="USD" disabled={!canManage} name="currencyCode" />
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="projectId" defaultValue="">
                <option value="">Organization-wide</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="contractId" defaultValue="">
                <option value="">No linked contract</option>
                {data.contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>{contract.title}</option>
                ))}
              </select>
              <Input disabled={!canManage} name="amountCents" placeholder="250000" type="number" />
              <Input disabled={!canManage} name="issuedAt" type="date" />
              <Input disabled={!canManage} name="dueAt" type="date" />
              <Input disabled={!canManage} name="paidAt" type="date" />
              <Textarea className="md:col-span-2" disabled={!canManage} name="notes" placeholder="Invoice notes" />
              <Button className="md:col-span-2" disabled={!canManage} type="submit">Create issued invoice</Button>
            </form>
            {data.issuedInvoices.map((invoice) => (
              <div key={invoice.id} className="rounded-2xl border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber} · {invoice.customerName}</p>
                    <p className="text-muted-foreground">{invoice.project?.name ?? "No project"} · {invoice.contract?.title ?? "No contract"}</p>
                  </div>
                  <Badge variant="secondary">{invoice.status}</Badge>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <div>{formatCurrency(invoice.amountCents)}</div>
                  <div>Issued {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : "TBD"}</div>
                  <div>Due {invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString() : "TBD"}</div>
                  <div>{invoice.paidAt ? `Paid ${new Date(invoice.paidAt).toLocaleDateString()}` : "Open"}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>Received invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                void submitJson("/api/finance/received-invoices", {
                  projectId: formData.get("projectId") || undefined,
                  contractId: formData.get("contractId") || undefined,
                  invoiceNumber: formData.get("invoiceNumber"),
                  vendorName: formData.get("vendorName"),
                  status: formData.get("status"),
                  amountCents: Number(formData.get("amountCents") || 0),
                  currencyCode: formData.get("currencyCode"),
                  issuedAt: formData.get("issuedAt") || undefined,
                  dueAt: formData.get("dueAt") || undefined,
                  paidAt: formData.get("paidAt") || undefined,
                  notes: formData.get("notes")
                }, "Received invoice created.");
              }}
            >
              <Input disabled={!canManage} name="invoiceNumber" placeholder="INV-445" />
              <Input disabled={!canManage} name="vendorName" placeholder="Vendor" />
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="status" defaultValue={InvoiceStatus.PENDING}>
                {invoiceStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <Input defaultValue="USD" disabled={!canManage} name="currencyCode" />
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="projectId" defaultValue="">
                <option value="">Organization-wide</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="contractId" defaultValue="">
                <option value="">No linked contract</option>
                {data.contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>{contract.title}</option>
                ))}
              </select>
              <Input disabled={!canManage} name="amountCents" placeholder="120000" type="number" />
              <Input disabled={!canManage} name="issuedAt" type="date" />
              <Input disabled={!canManage} name="dueAt" type="date" />
              <Input disabled={!canManage} name="paidAt" type="date" />
              <Textarea className="md:col-span-2" disabled={!canManage} name="notes" placeholder="Invoice notes" />
              <Button className="md:col-span-2" disabled={!canManage} type="submit">Create received invoice</Button>
            </form>
            {data.receivedInvoices.map((invoice) => (
              <div key={invoice.id} className="rounded-2xl border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber} · {invoice.vendorName}</p>
                    <p className="text-muted-foreground">{invoice.project?.name ?? "No project"} · {invoice.contract?.title ?? "No contract"}</p>
                  </div>
                  <Badge variant="secondary">{invoice.status}</Badge>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <div>{formatCurrency(invoice.amountCents)}</div>
                  <div>Issued {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : "TBD"}</div>
                  <div>Due {invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString() : "TBD"}</div>
                  <div>{invoice.paidAt ? `Paid ${new Date(invoice.paidAt).toLocaleDateString()}` : "Open"}</div>
                </div>
              </div>
            ))}
          </CardContent>
          </Card>
        </div>
      ) : null}

      {canAccessApprovalsAudit ? (
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>Approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.approvalRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No approval requests yet.</p>
            ) : (
              data.approvalRequests.map((approval) => (
                <div key={approval.id} className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{approval.actionLabel}</p>
                      <p className="text-sm text-muted-foreground">
                        {approval.entityType} · {approval.project?.name ?? approval.contract?.title ?? "Organization-wide"} · requested by {approval.requestedBy.name ?? approval.requestedBy.email}
                      </p>
                      {approval.reason ? <p className="text-sm text-muted-foreground">{approval.reason}</p> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={approval.status === ApprovalStatus.PENDING ? "secondary" : "default"}>
                        {approval.status}
                      </Badge>
                      <span className="text-sm font-medium">
                        {approval.amountCents !== null ? formatCurrency(approval.amountCents) : "No amount"}
                      </span>
                      {approval.status === ApprovalStatus.PENDING && canManage ? (
                        <>
                          <Button size="sm" type="button" onClick={() => patchApproval(approval.id, ApprovalStatus.APPROVED)}>
                            Approve
                          </Button>
                          <Button size="sm" type="button" variant="destructive" onClick={() => patchApproval(approval.id, ApprovalStatus.REJECTED)}>
                            Reject
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-amber-400/20">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>Approvals & audit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Approval queues and decision audit trails are part of Pro.</p>
            <p>Upgrade when the studio needs formal finance governance across contracts, invoices, payables, and large entries.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

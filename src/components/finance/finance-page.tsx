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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { AccountsPayableSection } from "@/components/finance/accounts-payable-section";
import { AccountsReceivableSection } from "@/components/finance/accounts-receivable-section";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useProgressiveLoad } from "@/hooks/use-progressive-load";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatNumber } from "@/lib/utils";

const budgetStatuses = Object.values(BudgetStatus);
const financeStatuses = Object.values(FinanceEntryStatus);
const revenueSourceTypes = Object.values(RevenueSourceType);
const expenseCategories = Object.values(ExpenseCategory);
const contractStatuses = Object.values(ContractStatus);
const contractCounterpartyTypes = Object.values(ContractCounterpartyType);
const royaltyStatuses = Object.values(RoyaltyStatus);
const invoiceStatuses = Object.values(InvoiceStatus);

type FinanceSummary = {
  activeBudgetsCount: number;
  totalBudgetPlannedCents: number;
  totalBudgetActualCents: number;
  totalRevenueNetCents: number;
  totalExpensesPaidCents: number;
  pendingRevenueCents: number;
  pendingExpenseCents: number;
  payableOpenCents: number;
  receivableOpenCents: number;
  overduePayablesCount: number;
  overdueReceivablesCount: number;
  royaltiesDueCents: number;
  pendingApprovalsCount: number;
  netCashCents: number;
};

type FinanceOverview = {
  projects: any[];
  costCenters: any[];
  budgets: any[];
  revenueEntries: any[];
  expenseEntries: any[];
  payableTitles: any[];
  receivableTitles: any[];
  contracts: any[];
  royaltyAgreements: any[];
  royaltyStatements: any[];
  issuedInvoices: any[];
  receivedInvoices: any[];
  approvalRequests: any[];
  summary: FinanceSummary;
  cashflow: any[];
  commercialOperations: {
    revenueChannels: any[];
    reconciliation: {
      unlinkedRevenueEntriesCount: number;
      openIssuedInvoicesCount: number;
      openIssuedInvoicesCents: number;
      overdueIssuedInvoicesCount: number;
      pendingRoyaltyStatementsCount: number;
      royaltiesDueCents: number;
    };
  };
  projectSnapshots: any[];
};

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
  canManage,
  summary
}: {
  canAccessApprovalsAudit: boolean;
  canAccessContractsRoyalties: boolean;
  canAccessFinanceWorkspace: boolean;
  canAccessInvoiceOps: boolean;
  organizationName: string;
  planLabel: string;
  canManage: boolean;
  summary: FinanceSummary | null;
}) {
  const queryClient = useQueryClient();
  const t = useI18n();
  const progressive = useProgressiveLoad<HTMLDivElement>();
  const overviewQuery = useQuery({
    queryKey: ["finance", "overview"],
    queryFn: () => apiClient<FinanceOverview>("/api/finance/overview"),
    enabled: canAccessFinanceWorkspace && progressive.shouldLoad
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [financeView, setFinanceView] = useState<"dashboard" | "receivables" | "payables" | "budget" | "contracts" | "invoices" | "approvals">("dashboard");
  const data = overviewQuery.data;

  if (!canAccessFinanceWorkspace || !summary) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("finance.pageTitle")}</h1>
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
      setError(payload?.message ?? "Não foi possível salvar os dados financeiros.");
      return;
    }

    setMessage(successMessage);
    void queryClient.invalidateQueries({ queryKey: ["finance", "overview"] });
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
      setError(payload?.message ?? "Não foi possível atualizar os dados financeiros.");
      return;
    }

    setMessage(successMessage);
    void queryClient.invalidateQueries({ queryKey: ["finance", "overview"] });
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
      setError(payload?.message ?? "Não foi possível atualizar a aprovação.");
      return;
    }

    setMessage(`Aprovação ${status.toLowerCase()}.`);
    void queryClient.invalidateQueries({ queryKey: ["finance", "overview"] });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("finance.pageTitle")}</h1>
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard label={t("finance.activeBudgets")} value={formatNumber(summary.activeBudgetsCount)} />
        <KpiCard label={t("finance.plannedBudget")} value={formatCurrency(summary.totalBudgetPlannedCents)} />
        <KpiCard label={t("finance.revenueReceived")} value={formatCurrency(summary.totalRevenueNetCents)} />
        <KpiCard label={t("finance.expensesPaid")} value={formatCurrency(summary.totalExpensesPaidCents)} />
        {canAccessInvoiceOps ? <KpiCard label={t("finance.receivablesView")} value={formatCurrency(summary.receivableOpenCents)} /> : null}
        {canAccessInvoiceOps ? <KpiCard label={t("finance.payablesOpenKpi")} value={formatCurrency(summary.payableOpenCents)} /> : null}
        {canAccessInvoiceOps ? <KpiCard label={t("finance.titlesOverdueKpi")} value={formatNumber(summary.overduePayablesCount)} /> : null}
      </div>

      <div ref={progressive.ref}>
        {!data ? (
          <Card className="overflow-hidden">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader>
              <CardTitle>{t("finance.operationalRecords")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {overviewQuery.isError
                ? t("finance.fullWorkspaceError")
                : overviewQuery.isFetching
                  ? t("finance.fullWorkspaceLoading")
                  : t("finance.fullWorkspaceReady")}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {data ? (
        <>
          <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/25 p-1">
            {[
              ["dashboard", t("finance.dashboardView")],
              ["receivables", t("finance.receivablesView")],
              ["payables", t("finance.payablesView")],
              ["budget", t("finance.budgetView")],
              ["contracts", t("finance.contractsView")],
              ["invoices", t("finance.invoicesView")],
              ["approvals", t("finance.approvalsView")]
            ].map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={financeView === value ? "default" : "ghost"}
                onClick={() => setFinanceView(value as typeof financeView)}
              >
                {label}
              </Button>
            ))}
          </div>

      {financeView === "receivables" ? (
        canAccessInvoiceOps ? (
          <AccountsReceivableSection
            canManage={canManage}
            projects={data.projects}
            receivableTitles={data.receivableTitles}
            submitJson={submitJson}
            summary={{
              receivableOpenCents: data.summary.receivableOpenCents,
              overdueReceivablesCount: data.summary.overdueReceivablesCount
            }}
          />
        ) : (
          <Card className="overflow-hidden border-amber-400/20">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader>
              <CardTitle>{t("finance.receivablesView")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{t("finance.receivablesProOnly")}</p>
            </CardContent>
          </Card>
        )
      ) : null}

      {financeView === "payables" ? (
        canAccessInvoiceOps ? (
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
              <CardTitle>{t("finance.payablesView")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{t("finance.payablesProOnly")}</p>
            </CardContent>
          </Card>
        )
      ) : null}

      {financeView === "dashboard" ? (
        <>
      <Card className="overflow-hidden">
        <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
        <CardHeader>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>{t("finance.commercialOperations")}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("finance.commercialOperationsCopy")}
              </p>
            </div>
            <Badge variant="secondary">{t("finance.channelReconciliation")}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <KpiCard label={t("finance.revenueChannels")} value={formatNumber(data.commercialOperations.revenueChannels.length)} />
            <KpiCard label={t("finance.unlinkedRevenue")} value={formatNumber(data.commercialOperations.reconciliation.unlinkedRevenueEntriesCount)} />
            <KpiCard label={t("finance.openInvoices")} value={formatNumber(data.commercialOperations.reconciliation.openIssuedInvoicesCount)} />
            <KpiCard label={t("finance.openInvoiceValue")} value={formatCurrency(data.commercialOperations.reconciliation.openIssuedInvoicesCents)} />
            <KpiCard label={t("finance.overdueInvoices")} value={formatNumber(data.commercialOperations.reconciliation.overdueIssuedInvoicesCount)} />
            <KpiCard label={t("finance.royaltiesDue")} value={formatCurrency(data.commercialOperations.reconciliation.royaltiesDueCents)} />
          </div>
          {data.commercialOperations.revenueChannels.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("finance.noRevenueChannels")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("finance.channel")}</TableHead>
                  <TableHead>{t("finance.type")}</TableHead>
                  <TableHead>{t("finance.entries")}</TableHead>
                  <TableHead>{t("finance.projects")}</TableHead>
                  <TableHead>{t("finance.received")}</TableHead>
                  <TableHead>{t("finance.pending")}</TableHead>
                  <TableHead>{t("finance.lastActivity")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.commercialOperations.revenueChannels.map((channel) => (
                  <TableRow key={`${channel.sourceType}:${channel.sourceName}`}>
                    <TableCell className="font-medium">{channel.sourceName}</TableCell>
                    <TableCell>{channel.sourceType}</TableCell>
                    <TableCell>{formatNumber(channel.entriesCount)}</TableCell>
                    <TableCell>{formatNumber(channel.linkedProjectsCount)}</TableCell>
                    <TableCell>{formatCurrency(channel.receivedCents)}</TableCell>
                    <TableCell>{formatCurrency(channel.pendingCents)}</TableCell>
                    <TableCell>{channel.lastReceivedAt ? new Date(channel.lastReceivedAt).toLocaleDateString() : "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>{t("finance.cashFlow")}</CardTitle>
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
                <Bar dataKey="inflowCents" fill="#10b981" name="Inflow" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="outflowCents" fill="#ef4444" name="Outflow" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>{t("finance.projectPnlSnapshots")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.projectSnapshots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("finance.noProjectFinancialEntries")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("finance.project")}</TableHead>
                    <TableHead>{t("finance.revenue")}</TableHead>
                    <TableHead>{t("finance.expenses")}</TableHead>
                    <TableHead>{t("finance.net")}</TableHead>
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
        </>
      ) : null}

      {financeView === "budget" ? (
        <>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1 overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>{t("finance.createBudget")}</CardTitle>
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
                }, t("finance.budgetCreated"));
              }}
            >
              <div className="space-y-2">
                <Label>{t("finance.budgetName")}</Label>
                <Input disabled={!canManage} name="name" placeholder="Vertical Slice Budget" />
              </div>
              <div className="space-y-2">
                <Label>{t("finance.project")}</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="projectId" defaultValue="">
                  <option value="">{t("finance.organizationWide")}</option>
                  {data.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("finance.status")}</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="status" defaultValue={BudgetStatus.DRAFT}>
                    {budgetStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.currency")}</Label>
                  <Input defaultValue="USD" disabled={!canManage} maxLength={3} name="currencyCode" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("finance.startsAt")}</Label>
                  <Input disabled={!canManage} name="startsAt" type="date" />
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.endsAt")}</Label>
                  <Input disabled={!canManage} name="endsAt" type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("finance.notes")}</Label>
                <Textarea disabled={!canManage} name="notes" placeholder="Scope, staffing assumptions, target runway..." />
              </div>
              <Button disabled={!canManage} type="submit">{t("finance.createBudget")}</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1 overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>{t("finance.recordRevenue")}</CardTitle>
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
                }, t("finance.revenueEntryCreated"));
              }}
            >
              <div className="space-y-2">
                <Label>{t("finance.source")}</Label>
                <Input disabled={!canManage} name="sourceName" placeholder="Steam May payout" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("finance.type")}</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="sourceType" defaultValue={RevenueSourceType.STEAM}>
                    {revenueSourceTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.status")}</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="status" defaultValue={FinanceEntryStatus.RECEIVED}>
                    {financeStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("finance.grossCents")}</Label>
                  <Input disabled={!canManage} name="grossCents" placeholder="1250000" type="number" />
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.netCents")}</Label>
                  <Input disabled={!canManage} name="netCents" placeholder="875000" type="number" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("finance.project")}</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="projectId" defaultValue="">
                    <option value="">{t("finance.organizationWide")}</option>
                    {data.projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.receivedAt")}</Label>
                  <Input disabled={!canManage} name="receivedAt" type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("finance.notes")}</Label>
                <Textarea disabled={!canManage} name="notes" placeholder="Steam, publisher recoup, grant tranche..." />
              </div>
              <Button disabled={!canManage} type="submit">{t("finance.createRevenueEntry")}</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1 overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>{t("finance.recordExpense")}</CardTitle>
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
                }, t("finance.expenseEntryCreated"));
              }}
            >
              <div className="space-y-2">
                <Label>{t("finance.vendorPayee")}</Label>
                <Input disabled={!canManage} name="vendorName" placeholder="Contract artist" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("finance.category")}</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="category" defaultValue={ExpenseCategory.CONTRACTOR}>
                    {expenseCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.status")}</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="status" defaultValue={FinanceEntryStatus.PENDING}>
                    {financeStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("finance.amountCents")}</Label>
                  <Input disabled={!canManage} name="amountCents" placeholder="250000" type="number" />
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.project")}</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="projectId" defaultValue="">
                    <option value="">{t("finance.organizationWide")}</option>
                    {data.projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t("finance.occurredAt")}</Label>
                  <Input disabled={!canManage} name="occurredAt" type="date" />
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.dueAt")}</Label>
                  <Input disabled={!canManage} name="dueAt" type="date" />
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.paidAt")}</Label>
                  <Input disabled={!canManage} name="paidAt" type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("finance.notes")}</Label>
                <Textarea disabled={!canManage} name="notes" placeholder="Milestone payout, legal bill, software annual plan..." />
              </div>
              <Button disabled={!canManage} type="submit">{t("finance.createExpenseEntry")}</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
        <CardHeader>
          <CardTitle>{t("finance.budgets")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.budgets.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("finance.noBudgetsYet")}</p>
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
                    }, t("finance.budgetUpdated"));
                  }}
                >
                  <div className="space-y-2 xl:col-span-2">
                    <Label>{t("finance.name")}</Label>
                    <Input defaultValue={budget.name} disabled={!canManage} name="name" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("finance.project")}</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={budget.projectId ?? ""} disabled={!canManage} name="projectId">
                      <option value="">{t("finance.organizationWide")}</option>
                      {data.projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("finance.status")}</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={budget.status} disabled={!canManage} name="status">
                      {budgetStatuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("finance.startsAt")}</Label>
                    <Input defaultValue={formatDateInput(budget.startsAt)} disabled={!canManage} name="startsAt" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("finance.endsAt")}</Label>
                    <Input defaultValue={formatDateInput(budget.endsAt)} disabled={!canManage} name="endsAt" type="date" />
                  </div>
                  <div className="space-y-2 xl:col-span-2">
                    <Label>{t("finance.notes")}</Label>
                    <Textarea defaultValue={budget.notes ?? ""} disabled={!canManage} name="notes" />
                  </div>
                  <div className="flex items-end">
                    <Button disabled={!canManage} type="submit">{t("finance.saveBudget")}</Button>
                  </div>
                  <div className="flex items-end justify-end xl:col-span-3">
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="secondary">{t("finance.planned")} {formatCurrency(budget.totalPlannedCents)}</Badge>
                      <Badge variant="secondary">
                        {t("finance.actual")} {formatCurrency(budget.lines.reduce((sum: number, line: any) => sum + line.actualCents, 0))}
                      </Badge>
                    </div>
                  </div>
                </form>

                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("finance.category")}</TableHead>
                        <TableHead>{t("common.description")}</TableHead>
                        <TableHead>{t("finance.planned")}</TableHead>
                        <TableHead>{t("finance.actual")}</TableHead>
                        <TableHead>{t("finance.due")}</TableHead>
                        <TableHead>{t("finance.paid")}</TableHead>
                        <TableHead>{t("common.save")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budget.lines.map((line: any) => (
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
                                }, t("finance.budgetLineUpdated"));
                              }}
                            >
                              <Input defaultValue={line.category} disabled={!canManage} name="category" />
                              <div className="space-y-2">
                                <Input defaultValue={line.description} disabled={!canManage} name="description" />
                              <Input defaultValue={line.vendorName ?? ""} disabled={!canManage} name="vendorName" placeholder={t("finance.vendor")} />
                              </div>
                              <Input defaultValue={line.plannedCents} disabled={!canManage} name="plannedCents" type="number" />
                              <Input defaultValue={line.actualCents} disabled={!canManage} name="actualCents" type="number" />
                              <Input defaultValue={formatDateInput(line.dueAt)} disabled={!canManage} name="dueAt" type="date" />
                              <Input defaultValue={formatDateInput(line.paidAt)} disabled={!canManage} name="paidAt" type="date" />
                              <Button disabled={!canManage} size="sm" type="submit">{t("common.save")}</Button>
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
                              }, t("finance.budgetLineCreated"));
                            }}
                          >
                            <Input disabled={!canManage} name="category" placeholder="Category" />
                            <div className="space-y-2">
                              <Input disabled={!canManage} name="description" placeholder="Description" />
                            <Input disabled={!canManage} name="vendorName" placeholder={t("finance.vendor")} />
                            </div>
                            <Input defaultValue={0} disabled={!canManage} name="plannedCents" type="number" />
                            <Input defaultValue={0} disabled={!canManage} name="actualCents" type="number" />
                            <Input disabled={!canManage} name="dueAt" type="date" />
                            <Input disabled={!canManage} name="paidAt" type="date" />
                            <Button disabled={!canManage} size="sm" type="submit">{t("finance.addLine")}</Button>
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
            <CardTitle>{t("finance.revenueLedger")}</CardTitle>
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
                  }, t("finance.revenueEntryUpdated"));
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
                    <option value="">{t("finance.organizationWide")}</option>
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
                  <Textarea defaultValue={entry.notes ?? ""} disabled={!canManage} name="notes" placeholder={t("finance.notes")} />
                  <Button disabled={!canManage} type="submit">{t("common.save")}</Button>
                </div>
              </form>
            ))}
            {data.revenueEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("finance.noRevenueEntries")}</p>
            ) : null}
          </CardContent>
        </Card>

          <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>{t("finance.expenseLedger")}</CardTitle>
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
                  }, t("finance.expenseEntryUpdated"));
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
                    <option value="">{t("finance.organizationWide")}</option>
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
                  <Textarea defaultValue={entry.notes ?? ""} disabled={!canManage} name="notes" placeholder={t("finance.notes")} />
                  <Button disabled={!canManage} type="submit">{t("common.save")}</Button>
                </div>
              </form>
            ))}
            {data.expenseEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("finance.noExpenseEntries")}</p>
            ) : null}
          </CardContent>
          </Card>
      </div>
        </>
      ) : null}

      {financeView === "contracts" ? (
      canAccessContractsRoyalties ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>{t("finance.contracts")}</CardTitle>
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
                }, t("finance.contractCreated"));
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
                <option value="">{t("finance.organizationWide")}</option>
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
              <Button className="md:col-span-2" disabled={!canManage} type="submit">{t("finance.createContract")}</Button>
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
                  }, t("finance.contractUpdated"));
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
                    <option value="">{t("finance.organizationWide")}</option>
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
                    {contract.project?.name ?? t("finance.noProject")} · {formatCurrency(contract.totalValueCents ?? 0)}
                  </div>
                  <Button disabled={!canManage} type="submit">{t("finance.saveContract")}</Button>
                </div>
              </form>
            ))}
          </CardContent>
        </Card>

          <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>{t("finance.royalties")}</CardTitle>
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
                }, t("finance.royaltyAgreementCreated"));
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
                <option value="">{t("finance.organizationWide")}</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="contractId" defaultValue="">
                <option value="">{t("finance.noLinkedContract")}</option>
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
              <Button className="md:col-span-2" disabled={!canManage} type="submit">{t("finance.createRoyaltyAgreement")}</Button>
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
                }, t("finance.royaltyStatementCreated"));
              }}
            >
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="royaltyAgreementId" defaultValue="">
                <option value="" disabled>{t("finance.selectAgreement")}</option>
                {data.royaltyAgreements.map((agreement) => (
                  <option key={agreement.id} value={agreement.id}>{agreement.name}</option>
                ))}
              </select>
              <Input disabled={!canManage} name="periodLabel" placeholder="2026-Q2" />
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="projectId" defaultValue="">
                <option value="">{t("finance.useAgreementProject")}</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <Input disabled={!canManage} name="grossRevenueCents" placeholder="900000" type="number" />
              <Input disabled={!canManage} name="deductibleCents" placeholder="100000" type="number" />
              <Input disabled={!canManage} name="periodStart" type="date" />
              <Input disabled={!canManage} name="periodEnd" type="date" />
              <Textarea className="md:col-span-2" disabled={!canManage} name="notes" placeholder="Statement notes" />
              <Button className="md:col-span-2" disabled={!canManage} type="submit">{t("finance.createRoyaltyStatement")}</Button>
            </form>
            {data.royaltyStatements.map((statement) => (
              <div key={statement.id} className="rounded-2xl border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{statement.periodLabel} · {statement.royaltyAgreement.name}</p>
                    <p className="text-muted-foreground">{statement.project?.name ?? t("finance.noProject")} · {statement.royaltyAgreement.partnerName}</p>
                  </div>
                  <Badge variant={statement.paidAt ? "default" : "secondary"}>
                    {statement.paidAt ? t("finance.paid") : t("finance.pending")}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <div>{t("finance.gross")} {formatCurrency(statement.grossRevenueCents)}</div>
                  <div>{t("finance.net")} {formatCurrency(statement.netRevenueCents)}</div>
                  <div>{t("finance.royaltyDue")} {formatCurrency(statement.royaltyDueCents)}</div>
                  <div>{statement.paidAt ? `${t("finance.paid")} ${new Date(statement.paidAt).toLocaleDateString()}` : t("finance.awaitingPayout")}</div>
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
            <CardTitle>{t("finance.contractsRoyalties")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{t("finance.contractsRoyaltiesProOnly")}</p>
            <p>{t("finance.contractsRoyaltiesProOnlyDetail")}</p>
          </CardContent>
        </Card>
      )
      ) : null}

      {financeView === "invoices" ? (
      canAccessInvoiceOps ? (
        <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>{t("finance.issuedInvoices")}</CardTitle>
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
                }, t("finance.issuedInvoiceCreated"));
              }}
            >
              <Input disabled={!canManage} name="invoiceNumber" placeholder="NF-2026-001" />
              <Input disabled={!canManage} name="customerName" placeholder={t("finance.customer")} />
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="status" defaultValue={InvoiceStatus.ISSUED}>
                {invoiceStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <Input defaultValue="USD" disabled={!canManage} name="currencyCode" />
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="projectId" defaultValue="">
                <option value="">{t("finance.organizationWide")}</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="contractId" defaultValue="">
                <option value="">{t("finance.noLinkedContract")}</option>
                {data.contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>{contract.title}</option>
                ))}
              </select>
              <Input disabled={!canManage} name="amountCents" placeholder="250000" type="number" />
              <Input disabled={!canManage} name="issuedAt" type="date" />
              <Input disabled={!canManage} name="dueAt" type="date" />
              <Input disabled={!canManage} name="paidAt" type="date" />
              <Textarea className="md:col-span-2" disabled={!canManage} name="notes" placeholder={t("finance.invoiceNotes")} />
              <Button className="md:col-span-2" disabled={!canManage} type="submit">{t("finance.createIssuedInvoice")}</Button>
            </form>
            {data.issuedInvoices.map((invoice) => (
              <div key={invoice.id} className="rounded-2xl border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber} · {invoice.customerName}</p>
                    <p className="text-muted-foreground">{invoice.project?.name ?? t("finance.noProject")} · {invoice.contract?.title ?? t("finance.noLinkedContract")}</p>
                  </div>
                  <Badge variant="secondary">{invoice.status}</Badge>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <div>{formatCurrency(invoice.amountCents)}</div>
                  <div>{t("finance.issued")} {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : t("finance.tbd")}</div>
                  <div>{t("finance.due")} {invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString() : t("finance.tbd")}</div>
                  <div>{invoice.paidAt ? `${t("finance.paid")} ${new Date(invoice.paidAt).toLocaleDateString()}` : t("finance.openStatus")}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>{t("finance.receivedInvoices")}</CardTitle>
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
                }, t("finance.receivedInvoiceCreated"));
              }}
            >
              <Input disabled={!canManage} name="invoiceNumber" placeholder="INV-445" />
              <Input disabled={!canManage} name="vendorName" placeholder={t("finance.vendor")} />
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="status" defaultValue={InvoiceStatus.PENDING}>
                {invoiceStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <Input defaultValue="USD" disabled={!canManage} name="currencyCode" />
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="projectId" defaultValue="">
                <option value="">{t("finance.organizationWide")}</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canManage} name="contractId" defaultValue="">
                <option value="">{t("finance.noLinkedContract")}</option>
                {data.contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>{contract.title}</option>
                ))}
              </select>
              <Input disabled={!canManage} name="amountCents" placeholder="120000" type="number" />
              <Input disabled={!canManage} name="issuedAt" type="date" />
              <Input disabled={!canManage} name="dueAt" type="date" />
              <Input disabled={!canManage} name="paidAt" type="date" />
              <Textarea className="md:col-span-2" disabled={!canManage} name="notes" placeholder={t("finance.invoiceNotes")} />
              <Button className="md:col-span-2" disabled={!canManage} type="submit">{t("finance.createReceivedInvoice")}</Button>
            </form>
            {data.receivedInvoices.map((invoice) => (
              <div key={invoice.id} className="rounded-2xl border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber} · {invoice.vendorName}</p>
                    <p className="text-muted-foreground">{invoice.project?.name ?? t("finance.noProject")} · {invoice.contract?.title ?? t("finance.noLinkedContract")}</p>
                  </div>
                  <Badge variant="secondary">{invoice.status}</Badge>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <div>{formatCurrency(invoice.amountCents)}</div>
                  <div>{t("finance.issued")} {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : t("finance.tbd")}</div>
                  <div>{t("finance.due")} {invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString() : t("finance.tbd")}</div>
                  <div>{invoice.paidAt ? `${t("finance.paid")} ${new Date(invoice.paidAt).toLocaleDateString()}` : t("finance.openStatus")}</div>
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
            <CardTitle>{t("finance.invoicesView")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{t("finance.invoicesProOnly")}</p>
          </CardContent>
        </Card>
      )
      ) : null}

      {financeView === "approvals" ? (
      canAccessApprovalsAudit ? (
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>{t("finance.approvals")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.approvalRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("finance.noApprovalRequests")}</p>
            ) : (
              data.approvalRequests.map((approval) => (
                <div key={approval.id} className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{approval.actionLabel}</p>
                      <p className="text-sm text-muted-foreground">
                        {approval.entityType} · {approval.project?.name ?? approval.contract?.title ?? t("finance.organizationWide")} · {t("finance.requestedBy")} {approval.requestedBy.name ?? approval.requestedBy.email}
                      </p>
                      {approval.reason ? <p className="text-sm text-muted-foreground">{approval.reason}</p> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={approval.status === ApprovalStatus.PENDING ? "secondary" : "default"}>
                        {approval.status}
                      </Badge>
                      <span className="text-sm font-medium">
                        {approval.amountCents !== null ? formatCurrency(approval.amountCents) : t("finance.noAmount")}
                      </span>
                      {approval.status === ApprovalStatus.PENDING && canManage ? (
                        <>
                          <Button size="sm" type="button" onClick={() => patchApproval(approval.id, ApprovalStatus.APPROVED)}>
                            {t("finance.approve")}
                          </Button>
                          <Button size="sm" type="button" variant="destructive" onClick={() => patchApproval(approval.id, ApprovalStatus.REJECTED)}>
                            {t("finance.reject")}
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
            <CardTitle>{t("finance.approvalsAudit")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{t("finance.approvalsAuditProOnly")}</p>
            <p>{t("finance.approvalsAuditProOnlyDetail")}</p>
          </CardContent>
        </Card>
      )
      ) : null}

        </>
      ) : null}
    </div>
  );
}

"use client";

import { PayablePaymentType, PayableTitleStatus } from "@prisma/client";
import { useDeferredValue, useMemo, useState } from "react";

import { useI18n, useUiLanguage } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatNumber } from "@/lib/utils";

const payableStatuses = Object.values(PayableTitleStatus);
const paymentTypes = Object.values(PayablePaymentType);

function formatDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function formatTokenLabel(value: string) {
  return value.replaceAll("_", " ");
}

function getStatusBadgeVariant(status: PayableTitleStatus) {
  if (status === PayableTitleStatus.PAID) {
    return "default";
  }

  if (status === PayableTitleStatus.CANCELED) {
    return "outline";
  }

  return "secondary";
}

export function AccountsPayableSection({
  canManage,
  projects,
  costCenters,
  payableTitles,
  summary,
  submitJson
}: {
  canManage: boolean;
  projects: Array<{ id: string; name: string; stage: string }>;
  costCenters: Array<{ id: string; code: string; name: string; active: boolean }>;
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
  summary: {
    payableOpenCents: number;
    overduePayablesCount: number;
  };
  submitJson: (url: string, body: Record<string, unknown>, successMessage: string) => Promise<void>;
}) {
  const t = useI18n();
  const language = useUiLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("ALL");
  const [costCenterFilter, setCostCenterFilter] = useState("ALL");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [sortBy, setSortBy] = useState("actualDueDate");
  const [allocations, setAllocations] = useState([
    {
      costCenterId: costCenters[0]?.id ?? "",
      natureDescription: "",
      amountCents: "0"
    }
  ]);

  const deferredSearch = useDeferredValue(search);
  const documentTypes = useMemo(
    () => Array.from(new Set(payableTitles.map((title) => title.documentType))).sort((left, right) => left.localeCompare(right)),
    [payableTitles]
  );
  const openPayablesCount = useMemo(
    () => payableTitles.filter((title) => title.status !== PayableTitleStatus.PAID && title.status !== PayableTitleStatus.CANCELED).length,
    [payableTitles]
  );
  const filteredTitles = useMemo(() => {
    const today = new Date();
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return payableTitles
      .filter((title) => {
        if (normalizedSearch) {
          const haystack = [
            title.titleNumber,
            title.supplierIdentifier,
            title.supplierName,
            title.natureDescription
          ].join(" ").toLowerCase();

          if (!haystack.includes(normalizedSearch)) {
            return false;
          }
        }

        if (statusFilter !== "ALL" && title.status !== statusFilter) {
          return false;
        }

        if (documentTypeFilter !== "ALL" && title.documentType !== documentTypeFilter) {
          return false;
        }

        if (costCenterFilter !== "ALL" && title.costCenterId !== costCenterFilter) {
          return false;
        }

        if (!onlyOverdue) {
          return true;
        }

        if (title.status === PayableTitleStatus.PAID || title.status === PayableTitleStatus.CANCELED) {
          return false;
        }

        return new Date(title.actualDueDate) < today;
      })
      .sort((left, right) => {
        if (sortBy === "supplierName") {
          return left.supplierName.localeCompare(right.supplierName);
        }

        if (sortBy === "totalAmountCents") {
          return right.totalAmountCents - left.totalAmountCents;
        }

        if (sortBy === "titleNumber") {
          return left.titleNumber.localeCompare(right.titleNumber);
        }

        return new Date(left.actualDueDate).getTime() - new Date(right.actualDueDate).getTime();
      });
  }, [costCenterFilter, deferredSearch, documentTypeFilter, onlyOverdue, payableTitles, sortBy, statusFilter]);

  const formatDate = (value: string) => new Date(value).toLocaleDateString(language);

    let resolvedValue1: any;
  if (costCenters.length === 0) {
    resolvedValue1 = <option value="">Crie um centro de custo</option>;
  } else {
    resolvedValue1 = null;
  }
  let resolvedValue6: any;
  if (filteredTitles.length === 0) {
    resolvedValue6 = (
            <p className="text-sm text-muted-foreground">{t("finance.noTitlesFound")}</p>
          );
  } else {
    resolvedValue6 = (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("finance.title")}</TableHead>
                    <TableHead>{t("finance.supplier")}</TableHead>
                    <TableHead>{t("finance.nature")}</TableHead>
                    <TableHead>{t("finance.costCenter")}</TableHead>
                    <TableHead>{t("finance.dueDate")}</TableHead>
                    <TableHead>{t("finance.actualDueDate")}</TableHead>
                    <TableHead>{t("finance.value")}</TableHead>
                    <TableHead>{t("finance.open")}</TableHead>
                    <TableHead>{t("finance.status")}</TableHead>
                    <TableHead>{t("finance.settlement")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTitles.map((title) => {
                    const openAmountCents = Math.max(title.totalAmountCents - title.paidAmountCents, 0);

                                        let resolvedValue7: any;
                    if (title.project?.name) {
                      resolvedValue7 = <p className="text-xs text-muted-foreground">{title.project.name}</p>;
                    } else {
                      resolvedValue7 = null;
                    }
                    let resolvedValue8: any;
                    if (title.additionalAmountCents > 0) {
                      resolvedValue8 = (
                              <p className="text-xs text-muted-foreground">{t("finance.addition")}: {formatCurrency(title.additionalAmountCents)}</p>
                            );
                    } else {
                      resolvedValue8 = null;
                    }
                    let resolvedValue9: any;
                    if (title.payments.length === 0) {
                      resolvedValue9 = (
                                  <p className="text-sm text-muted-foreground">{t("finance.noPaymentsRecorded")}</p>
                                );
                    } else {
                      resolvedValue9 = (
                                  <div className="space-y-2">
                                    {title.payments.map((payment) => (
                                      <div key={payment.id} className="rounded-xl border px-3 py-2 text-sm">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <span>{formatTokenLabel(payment.paymentType)}</span>
                                          <span className="font-medium">{formatCurrency(payment.amountPaidCents)}</span>
                                        </div>
                                        <p className="mt-1 text-muted-foreground">
                                          {formatDate(payment.paymentDate)} · {t("finance.fine")} {formatCurrency(payment.fineCents)} · {t("finance.interest")} {formatCurrency(payment.interestCents)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                );
                    }
return (
                      <TableRow key={title.id} className="align-top">
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{title.prefix} · {title.titleNumber}</p>
                            <p className="text-xs text-muted-foreground">{title.documentType}</p>
                            {resolvedValue7}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{title.supplierName}</p>
                            <p className="text-xs text-muted-foreground">{title.supplierIdentifier}</p>
                          </div>
                        </TableCell>
                        <TableCell>{title.natureDescription}</TableCell>
                        <TableCell>{title.costCenter.code} · {title.costCenter.name}</TableCell>
                        <TableCell>{formatDate(title.dueDate)}</TableCell>
                        <TableCell>{formatDate(title.actualDueDate)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p>{formatCurrency(title.totalAmountCents)}</p>
                            {resolvedValue8}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(openAmountCents)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(title.status)}>{formatTokenLabel(title.status)}</Badge>
                        </TableCell>
                        <TableCell className="min-w-[320px]">
                          <details className="group">
                            <summary className="cursor-pointer text-sm font-medium text-sky-600 marker:hidden">
                              {t("finance.viewAllocationAndSettle")}
                            </summary>
                            <div className="mt-3 space-y-4 rounded-2xl border p-3">
                              <div className="space-y-2">
                                <p className="text-sm font-medium">{t("finance.allocations")}</p>
                                <div className="space-y-2">
                                  {title.allocations.map((allocation: any) => (
                                    <div key={allocation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
                                      <span>{allocation.costCenter.code} · {allocation.costCenter.name}</span>
                                      <span>{allocation.natureDescription}</span>
                                      <span className="font-medium">{formatCurrency(allocation.amountCents)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <p className="text-sm font-medium">{t("finance.recordedPayments")}</p>
                                {resolvedValue9}
                              </div>

                              <form
                                className="grid gap-3"
                                onSubmit={(event: any) => {
                                  event.preventDefault();
                                  const formData = new FormData(event.currentTarget);
                                  void submitJson(`/api/finance/payables/${title.id}/payments`, {
                                    paymentType: formData.get("paymentType"),
                                    bank: formData.get("bank"),
                                    branch: formData.get("branch"),
                                    account: formData.get("account"),
                                    paymentDate: formData.get("paymentDate"),
                                    history: formData.get("history"),
                                    fineCents: Number(formData.get("fineCents") || 0),
                                    interestCents: Number(formData.get("interestCents") || 0),
                                    amountPaidCents: Number(formData.get("amountPaidCents") || 0)
                                  }, t("finance.paymentRegistered"));
                                  event.currentTarget.reset();
                                }}
                              >
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>{t("finance.paymentType")}</Label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={PayablePaymentType.TRANSFER} disabled={!canManage} name="paymentType">
                                      {paymentTypes.map((paymentType) => (
                                        <option key={paymentType} value={paymentType}>{formatTokenLabel(paymentType)}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("finance.paymentDate")}</Label>
                                    <Input disabled={!canManage} name="paymentDate" type="date" />
                                  </div>
                                </div>
                                <div className="grid gap-3 md:grid-cols-3">
                                  <div className="space-y-2">
                                    <Label>{t("finance.bank")}</Label>
                                    <Input disabled={!canManage} name="bank" placeholder={t("finance.bank")} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("finance.branch")}</Label>
                                    <Input disabled={!canManage} name="branch" placeholder={t("finance.branch")} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("finance.account")}</Label>
                                    <Input disabled={!canManage} name="account" placeholder={t("finance.account")} />
                                  </div>
                                </div>
                                <div className="grid gap-3 md:grid-cols-3">
                                  <div className="space-y-2">
                                    <Label>{t("finance.fine")}</Label>
                                    <Input defaultValue={0} disabled={!canManage} name="fineCents" type="number" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("finance.interest")}</Label>
                                    <Input defaultValue={0} disabled={!canManage} name="interestCents" type="number" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("finance.amountPaid")}</Label>
                                    <Input defaultValue={openAmountCents} disabled={!canManage} name="amountPaidCents" type="number" />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>{t("finance.history")}</Label>
                                  <Textarea disabled={!canManage} name="history" placeholder={t("finance.paymentHistoryPlaceholder")} />
                                </div>
                                <Button disabled={!canManage || title.status === PayableTitleStatus.PAID || title.status === PayableTitleStatus.CANCELED} size="sm" type="submit">
                                  {t("finance.registerPayment")}
                                </Button>
                              </form>
                            </div>
                          </details>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          );
  }
return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">{t("finance.openPayables")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(summary.payableOpenCents)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("finance.awaitingSettlement", {
                count: formatNumber(openPayablesCount)
              })}
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">{t("finance.overdueTitles")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatNumber(summary.overduePayablesCount)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("finance.actualDueDateHint")}
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">{t("finance.costCenters")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatNumber(costCenters.length)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("finance.costCentersHint")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{t("finance.newCostCenter")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event: any) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                void submitJson("/api/finance/cost-centers", {
                  code: formData.get("code"),
                  name: formData.get("name")
                }, t("finance.costCenterCreated"));
                event.currentTarget.reset();
              }}
            >
              <div className="space-y-2">
                <Label>{t("finance.code")}</Label>
                <Input disabled={!canManage} maxLength={12} name="code" placeholder="ADM" />
              </div>
              <div className="space-y-2">
                <Label>{t("finance.name")}</Label>
                <Input disabled={!canManage} name="name" placeholder="Administrativo" />
              </div>
              <Button disabled={!canManage} type="submit">{t("finance.createCostCenter")}</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{t("finance.titleRegistration")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event: any) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const titleAmountCents = Number(formData.get("titleAmountCents") || 0);
                const additionalAmountCents = Number(formData.get("additionalAmountCents") || 0);
                const parsedAllocations = allocations
                  .map((allocation: any) => ({
                    costCenterId: allocation.costCenterId,
                    natureDescription: allocation.natureDescription,
                    amountCents: Number(allocation.amountCents || 0)
                  }))
                  .filter((allocation: any) => allocation.costCenterId && allocation.natureDescription.trim());

                                let resolvedValue0: any;
                if (parsedAllocations.length) {
                  resolvedValue0 = parsedAllocations;
                } else {
                  resolvedValue0 = [{
                    costCenterId: String(formData.get("costCenterId") || ""),
                    natureDescription: String(formData.get("natureDescription") || ""),
                    amountCents: titleAmountCents + additionalAmountCents
                  }];
                }
void submitJson("/api/finance/payables", {
                  projectId: formData.get("projectId") || undefined,
                  costCenterId: formData.get("costCenterId"),
                  prefix: formData.get("prefix"),
                  titleNumber: formData.get("titleNumber"),
                  documentType: formData.get("documentType"),
                  natureDescription: formData.get("natureDescription"),
                  supplierIdentifier: formData.get("supplierIdentifier"),
                  supplierName: formData.get("supplierName"),
                  issueDate: formData.get("issueDate"),
                  dueDate: formData.get("dueDate"),
                  titleAmountCents,
                  additionalAmountCents,
                  notes: formData.get("notes"),
                  allocations: resolvedValue0
                }, t("finance.titleRegistered"));
                event.currentTarget.reset();
                setAllocations([
                  {
                    costCenterId: costCenters[0]?.id ?? "",
                    natureDescription: "",
                    amountCents: "0"
                  }
                ]);
              }}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-2">
                  <Label>{t("finance.prefix")}</Label>
                  <Input disabled={!canManage} name="prefix" placeholder="FIN" />
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.titleNumber")}</Label>
                  <Input disabled={!canManage} maxLength={8} name="titleNumber" placeholder="00012345" />
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.documentType")}</Label>
                  <Input disabled={!canManage} name="documentType" placeholder="Nota Fiscal" />
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.costCenter")}</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={costCenters[0]?.id ?? ""} disabled={!canManage || costCenters.length === 0} name="costCenterId">
                    {resolvedValue1}
                    {costCenters.map((costCenter) => (
                      <option key={costCenter.id} value={costCenter.id}>
                        {costCenter.code} · {costCenter.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.project")}</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="" disabled={!canManage} name="projectId">
                    <option value="">{t("finance.noLink")}</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2 xl:col-span-2">
                  <Label>{t("finance.nature")}</Label>
                  <Input disabled={!canManage} name="natureDescription" placeholder="Serviços de Terceiros" />
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.supplier")}</Label>
                  <Input disabled={!canManage} name="supplierIdentifier" placeholder="CNPJ ou código" />
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.supplierName")}</Label>
                  <Input disabled={!canManage} name="supplierName" placeholder="Nome fantasia" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label>{t("finance.issueDate")}</Label>
                  <Input disabled={!canManage} name="issueDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.dueDate")}</Label>
                  <Input disabled={!canManage} name="dueDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.titleAmount")}</Label>
                  <Input defaultValue={0} disabled={!canManage} name="titleAmountCents" type="number" />
                </div>
                <div className="space-y-2">
                  <Label>{t("finance.additions")}</Label>
                  <Input defaultValue={0} disabled={!canManage} name="additionalAmountCents" type="number" />
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{t("finance.allocationTitle")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("finance.allocationHelp")}
                    </p>
                  </div>
                  <Button
                    disabled={!canManage || costCenters.length === 0}
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAllocations((current: any) => [
                        ...current,
                        {
                          costCenterId: costCenters[0]?.id ?? "",
                          natureDescription: "",
                          amountCents: "0"
                        }
                      ]);
                    }}
                  >
                    {t("finance.addAllocation")}
                  </Button>
                </div>

                <div className="space-y-3">
                  {allocations.map((allocation, index) => {
                    let resolvedValue3: any;
                    if (costCenters.length === 0) {
                      resolvedValue3 = <option value="">Crie um centro de custo</option>;
                    } else {
                      resolvedValue3 = null;
                    }
                    return (
                    <div key={`${index}-${allocation.costCenterId}`} className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_160px_90px]">
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        disabled={!canManage || costCenters.length === 0}
                        value={allocation.costCenterId}
                        onChange={(event: any) => {
                          setAllocations((current: any) =>
                            current.map((item: any, itemIndex: number) =>
                              {
                              let resolvedValue2: any;
                              if (itemIndex === index) {
                                resolvedValue2 = { ...item, costCenterId: event.target.value };
                              } else {
                                resolvedValue2 = item;
                              }
                              return resolvedValue2;
                            }
                            )
                          );
                        }}
                      >
                        {resolvedValue3}
                        {costCenters.map((costCenter) => (
                          <option key={costCenter.id} value={costCenter.id}>
                            {costCenter.code} · {costCenter.name}
                          </option>
                        ))}
                      </select>
                      <Input
                        disabled={!canManage}
                        placeholder={t("finance.allocationNaturePlaceholder")}
                        value={allocation.natureDescription}
                        onChange={(event: any) => {
                          setAllocations((current: any) =>
                            current.map((item: any, itemIndex: number) =>
                              {
                              let resolvedValue4: any;
                              if (itemIndex === index) {
                                resolvedValue4 = { ...item, natureDescription: event.target.value };
                              } else {
                                resolvedValue4 = item;
                              }
                              return resolvedValue4;
                            }
                            )
                          );
                        }}
                      />
                      <Input
                        disabled={!canManage}
                        placeholder="Valor"
                        type="number"
                        value={allocation.amountCents}
                        onChange={(event: any) => {
                          setAllocations((current: any) =>
                            current.map((item: any, itemIndex: number) =>
                              {
                              let resolvedValue5: any;
                              if (itemIndex === index) {
                                resolvedValue5 = { ...item, amountCents: event.target.value };
                              } else {
                                resolvedValue5 = item;
                              }
                              return resolvedValue5;
                            }
                            )
                          );
                        }}
                      />
                      <Button
                        disabled={!canManage || allocations.length === 1}
                        size="sm"
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setAllocations((current: any) => current.filter((_: any, itemIndex: number) => itemIndex !== index));
                        }}
                      >
                        {t("finance.remove")}
                      </Button>
                    </div>
                  );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("finance.notes")}</Label>
                <Textarea disabled={!canManage} name="notes" placeholder="Internal notes, invoice remarks, RC notes, or approval context..." />
              </div>

              <Button disabled={!canManage || costCenters.length === 0} type="submit">{t("finance.registerTitle")}</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{t("finance.payablesHome")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-2 xl:col-span-2">
              <Label>{t("finance.search")}</Label>
              <Input
                placeholder={t("finance.searchPlaceholder")}
                value={search}
                onChange={(event: any) => setSearch(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("finance.status")}</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={statusFilter} onChange={(event: any) => setStatusFilter(event.target.value)}>
                <option value="ALL">Todos</option>
                {payableStatuses.map((status) => (
                  <option key={status} value={status}>{formatTokenLabel(status)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t("finance.document")}</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={documentTypeFilter} onChange={(event: any) => setDocumentTypeFilter(event.target.value)}>
                <option value="ALL">Todos</option>
                {documentTypes.map((documentType) => (
                  <option key={documentType} value={documentType}>{documentType}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t("finance.costCenter")}</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={costCenterFilter} onChange={(event: any) => setCostCenterFilter(event.target.value)}>
                <option value="ALL">Todos</option>
                {costCenters.map((costCenter) => (
                  <option key={costCenter.id} value={costCenter.id}>
                    {costCenter.code} · {costCenter.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t("finance.sortBy")}</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={sortBy} onChange={(event: any) => setSortBy(event.target.value)}>
                <option value="actualDueDate">{t("finance.actualDueDate")}</option>
                <option value="supplierName">{t("finance.supplier")}</option>
                <option value="totalAmountCents">{t("finance.highestValue")}</option>
                <option value="titleNumber">{t("finance.titleNumber")}</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              checked={onlyOverdue}
              className="h-4 w-4"
              type="checkbox"
              onChange={(event: any) => setOnlyOverdue(event.target.checked)}
            />
            {t("finance.showOnlyOverdue")}
          </label>

          {resolvedValue6}
        </CardContent>
      </Card>
    </div>
  );
}

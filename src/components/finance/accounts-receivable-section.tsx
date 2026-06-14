"use client";

import { PayablePaymentType, PayableTitleStatus } from "@prisma/client";
import { useDeferredValue, useMemo, useState } from "react";

import { useUiLanguage } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatNumber } from "@/lib/utils";

const receivableStatuses = Object.values(PayableTitleStatus);
const paymentTypes = Object.values(PayablePaymentType);

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

export function AccountsReceivableSection({
  canManage,
  projects,
  receivableTitles,
  summary,
  submitJson
}: {
  canManage: boolean;
  projects: Array<{ id: string; name: string; stage: string }>;
  receivableTitles: Array<{
    id: string;
    projectId: string | null;
    prefix: string;
    titleNumber: string;
    documentType: string;
    sourceDescription: string;
    customerIdentifier: string;
    customerName: string;
    issueDate: string;
    dueDate: string;
    actualDueDate: string;
    titleAmountCents: number;
    receivedAmountCents: number;
    currencyCode: string;
    status: PayableTitleStatus;
    notes: string | null;
    project: { id: string; name: string } | null;
    receipts: Array<{
      id: string;
      paymentType: PayablePaymentType;
      bank: string | null;
      branch: string | null;
      account: string | null;
      receivedAt: string;
      history: string | null;
      discountCents: number;
      interestCents: number;
      amountReceivedCents: number;
    }>;
  }>;
  summary: {
    receivableOpenCents: number;
    overdueReceivablesCount: number;
  };
  submitJson: (url: string, body: Record<string, unknown>, successMessage: string) => Promise<void>;
}) {
  const language = useUiLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const deferredSearch = useDeferredValue(search);

  const openReceivablesCount = useMemo(
    () => receivableTitles.filter((title) => title.status !== PayableTitleStatus.PAID && title.status !== PayableTitleStatus.CANCELED).length,
    [receivableTitles]
  );
  const filteredTitles = useMemo(() => {
    const today = new Date();
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return receivableTitles
      .filter((title) => {
        if (normalizedSearch) {
          const haystack = [
            title.titleNumber,
            title.customerIdentifier,
            title.customerName,
            title.sourceDescription
          ].join(" ").toLowerCase();

          if (!haystack.includes(normalizedSearch)) {
            return false;
          }
        }

        if (statusFilter !== "ALL" && title.status !== statusFilter) {
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
      .sort((left, right) => new Date(left.actualDueDate).getTime() - new Date(right.actualDueDate).getTime());
  }, [deferredSearch, onlyOverdue, receivableTitles, statusFilter]);

  const formatDate = (value: string) => new Date(value).toLocaleDateString(language);

    let resolvedValue0: any;
  if (filteredTitles.length === 0) {
    resolvedValue0 = (
            <p className="text-sm text-muted-foreground">Nenhum título a receber encontrado.</p>
          );
  } else {
    resolvedValue0 = (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Aberto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recebimento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTitles.map((title) => {
                    const openAmountCents = Math.max(title.titleAmountCents - title.receivedAmountCents, 0);

                                        let resolvedValue1: any;
                    if (title.project?.name) {
                      resolvedValue1 = <p className="text-xs text-muted-foreground">{title.project.name}</p>;
                    } else {
                      resolvedValue1 = null;
                    }
                    let resolvedValue2: any;
                    if (title.receipts.length === 0) {
                      resolvedValue2 = (
                                <p className="text-sm text-muted-foreground">Nenhum recebimento registrado.</p>
                              );
                    } else {
                      resolvedValue2 = (
                                <div className="space-y-2">
                                  {title.receipts.map((receipt) => (
                                    <div key={receipt.id} className="rounded-xl border px-3 py-2 text-sm">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span>{formatTokenLabel(receipt.paymentType)}</span>
                                        <span className="font-medium">{formatCurrency(receipt.amountReceivedCents)}</span>
                                      </div>
                                      <p className="mt-1 text-muted-foreground">
                                        {formatDate(receipt.receivedAt)} · Desconto {formatCurrency(receipt.discountCents)} · Juros {formatCurrency(receipt.interestCents)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              );
                    }
return (
                      <TableRow key={title.id} className="align-top">
                        <TableCell>
                          <p className="font-medium">{title.prefix} · {title.titleNumber}</p>
                          <p className="text-xs text-muted-foreground">{title.documentType}</p>
                          {resolvedValue1}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{title.customerName}</p>
                          <p className="text-xs text-muted-foreground">{title.customerIdentifier}</p>
                        </TableCell>
                        <TableCell>{title.sourceDescription}</TableCell>
                        <TableCell>{formatDate(title.actualDueDate)}</TableCell>
                        <TableCell>{formatCurrency(title.titleAmountCents)}</TableCell>
                        <TableCell>{formatCurrency(openAmountCents)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(title.status)}>{formatTokenLabel(title.status)}</Badge>
                        </TableCell>
                        <TableCell className="min-w-[320px]">
                          <details>
                            <summary className="cursor-pointer text-sm font-medium text-sky-600 marker:hidden">Ver recebimentos e baixar</summary>
                            <div className="mt-3 space-y-4 rounded-2xl border p-3">
                              {resolvedValue2}

                              <form
                                className="grid gap-3"
                                onSubmit={(event: any) => {
                                  event.preventDefault();
                                  const formData = new FormData(event.currentTarget);
                                  void submitJson(`/api/finance/receivables/${title.id}/payments`, {
                                    paymentType: formData.get("paymentType"),
                                    bank: formData.get("bank"),
                                    branch: formData.get("branch"),
                                    account: formData.get("account"),
                                    receivedAt: formData.get("receivedAt"),
                                    history: formData.get("history"),
                                    discountCents: Number(formData.get("discountCents") || 0),
                                    interestCents: Number(formData.get("interestCents") || 0),
                                    amountReceivedCents: Number(formData.get("amountReceivedCents") || 0)
                                  }, "Recebimento registrado.");
                                  event.currentTarget.reset();
                                }}
                              >
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>Tipo</Label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={PayablePaymentType.TRANSFER} disabled={!canManage} name="paymentType">
                                      {paymentTypes.map((paymentType) => (
                                        <option key={paymentType} value={paymentType}>{formatTokenLabel(paymentType)}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Data do recebimento</Label>
                                    <Input disabled={!canManage} name="receivedAt" type="date" />
                                  </div>
                                </div>
                                <div className="grid gap-3 md:grid-cols-3">
                                  <div className="space-y-2">
                                    <Label>Banco</Label>
                                    <Input disabled={!canManage} name="bank" placeholder="Banco" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Agência</Label>
                                    <Input disabled={!canManage} name="branch" placeholder="Agência" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Conta</Label>
                                    <Input disabled={!canManage} name="account" placeholder="Conta" />
                                  </div>
                                </div>
                                <div className="grid gap-3 md:grid-cols-3">
                                  <div className="space-y-2">
                                    <Label>Desconto</Label>
                                    <Input defaultValue={0} disabled={!canManage} name="discountCents" type="number" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Juros</Label>
                                    <Input defaultValue={0} disabled={!canManage} name="interestCents" type="number" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Valor recebido</Label>
                                    <Input defaultValue={openAmountCents} disabled={!canManage} name="amountReceivedCents" type="number" />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Histórico</Label>
                                  <Textarea disabled={!canManage} name="history" placeholder="Histórico do recebimento" />
                                </div>
                                <Button disabled={!canManage || title.status === PayableTitleStatus.PAID || title.status === PayableTitleStatus.CANCELED} size="sm" type="submit">
                                  Registrar recebimento
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
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Contas a receber em aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(summary.receivableOpenCents)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatNumber(openReceivablesCount)} títulos aguardando recebimento.
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Recebíveis vencidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatNumber(summary.overdueReceivablesCount)}</p>
            <p className="mt-2 text-sm text-muted-foreground">O vencimento real considera finais de semana e feriados nacionais.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Novo título a receber</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event: any) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);

              void submitJson("/api/finance/receivables", {
                projectId: formData.get("projectId") || undefined,
                prefix: formData.get("prefix"),
                titleNumber: formData.get("titleNumber"),
                documentType: formData.get("documentType"),
                sourceDescription: formData.get("sourceDescription"),
                customerIdentifier: formData.get("customerIdentifier"),
                customerName: formData.get("customerName"),
                issueDate: formData.get("issueDate"),
                dueDate: formData.get("dueDate"),
                titleAmountCents: Number(formData.get("titleAmountCents") || 0),
                notes: formData.get("notes")
              }, "Título a receber cadastrado.");
              event.currentTarget.reset();
            }}
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2">
                <Label>Prefixo</Label>
                <Input disabled={!canManage} name="prefix" placeholder="REC" />
              </div>
              <div className="space-y-2">
                <Label>Nº do título</Label>
                <Input disabled={!canManage} maxLength={12} name="titleNumber" placeholder="00012345" />
              </div>
              <div className="space-y-2">
                <Label>Documento</Label>
                <Input disabled={!canManage} name="documentType" placeholder="Invoice" />
              </div>
              <div className="space-y-2">
                <Label>Projeto</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="" disabled={!canManage} name="projectId">
                  <option value="">Sem vínculo</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input defaultValue={0} disabled={!canManage} name="titleAmountCents" type="number" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-2">
                <Label>Origem</Label>
                <Input disabled={!canManage} name="sourceDescription" placeholder="Steam revenue, publisher milestone, grant..." />
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input disabled={!canManage} name="customerIdentifier" placeholder="CNPJ, VAT ou código" />
              </div>
              <div className="space-y-2">
                <Label>Nome do cliente</Label>
                <Input disabled={!canManage} name="customerName" placeholder="Nome do cliente" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>Emissão</Label>
                <Input disabled={!canManage} name="issueDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input disabled={!canManage} name="dueDate" type="date" />
              </div>
              <div className="space-y-2 xl:col-span-2">
                <Label>Observações</Label>
                <Input disabled={!canManage} name="notes" placeholder="Contexto interno do recebível" />
              </div>
            </div>

            <Button disabled={!canManage} type="submit">Cadastrar título a receber</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Contas a receber</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px]">
            <div className="space-y-2">
              <Label>Pesquisar</Label>
              <Input value={search} placeholder="Título, cliente ou origem" onChange={(event: any) => setSearch(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={statusFilter} onChange={(event: any) => setStatusFilter(event.target.value)}>
                <option value="ALL">Todos</option>
                {receivableStatuses.map((status) => (
                  <option key={status} value={status}>{formatTokenLabel(status)}</option>
                ))}
              </select>
            </div>
            <label className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
              <input checked={onlyOverdue} className="h-4 w-4" type="checkbox" onChange={(event: any) => setOnlyOverdue(event.target.checked)} />
              Mostrar vencidos
            </label>
          </div>

          {resolvedValue0}
        </CardContent>
      </Card>
    </div>
  );
}

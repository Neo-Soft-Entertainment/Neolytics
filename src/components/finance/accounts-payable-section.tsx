"use client";

import { PayablePaymentType, PayableTitleStatus } from "@prisma/client";
import { useState } from "react";

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

  const documentTypes = Array.from(new Set(payableTitles.map((title) => title.documentType))).sort((left, right) =>
    left.localeCompare(right)
  );

  const today = new Date();
  const normalizedSearch = search.trim().toLowerCase();
  const filteredTitles = payableTitles
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Contas a pagar em aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(summary.payableOpenCents)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatNumber(payableTitles.filter((title) => title.status !== PayableTitleStatus.PAID && title.status !== PayableTitleStatus.CANCELED).length)} títulos aguardando baixa.
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Títulos vencidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatNumber(summary.overduePayablesCount)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              O vencimento real já considera finais de semana e feriados nacionais.
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Centros de custo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatNumber(costCenters.length)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Cadastre centros para controlar despesa, rateio e baixa por unidade financeira.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Novo centro de custo</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                void submitJson("/api/finance/cost-centers", {
                  code: formData.get("code"),
                  name: formData.get("name")
                }, "Centro de custo criado.");
                event.currentTarget.reset();
              }}
            >
              <div className="space-y-2">
                <Label>Código</Label>
                <Input disabled={!canManage} maxLength={12} name="code" placeholder="ADM" />
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input disabled={!canManage} name="name" placeholder="Administrativo" />
              </div>
              <Button disabled={!canManage} type="submit">Criar centro de custo</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Cadastro de títulos</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const titleAmountCents = Number(formData.get("titleAmountCents") || 0);
                const additionalAmountCents = Number(formData.get("additionalAmountCents") || 0);
                const parsedAllocations = allocations
                  .map((allocation) => ({
                    costCenterId: allocation.costCenterId,
                    natureDescription: allocation.natureDescription,
                    amountCents: Number(allocation.amountCents || 0)
                  }))
                  .filter((allocation) => allocation.costCenterId && allocation.natureDescription.trim());

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
                  allocations: parsedAllocations.length ? parsedAllocations : [{
                    costCenterId: String(formData.get("costCenterId") || ""),
                    natureDescription: String(formData.get("natureDescription") || ""),
                    amountCents: titleAmountCents + additionalAmountCents
                  }]
                }, "Título cadastrado.");
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
                  <Label>Prefixo</Label>
                  <Input disabled={!canManage} name="prefix" placeholder="FIN" />
                </div>
                <div className="space-y-2">
                  <Label>Nº do título</Label>
                  <Input disabled={!canManage} maxLength={8} name="titleNumber" placeholder="00012345" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de documento</Label>
                  <Input disabled={!canManage} name="documentType" placeholder="Nota Fiscal" />
                </div>
                <div className="space-y-2">
                  <Label>Centro de custo</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={costCenters[0]?.id ?? ""} disabled={!canManage || costCenters.length === 0} name="costCenterId">
                    {costCenters.length === 0 ? <option value="">Crie um centro de custo</option> : null}
                    {costCenters.map((costCenter) => (
                      <option key={costCenter.id} value={costCenter.id}>
                        {costCenter.code} · {costCenter.name}
                      </option>
                    ))}
                  </select>
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
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2 xl:col-span-2">
                  <Label>Natureza</Label>
                  <Input disabled={!canManage} name="natureDescription" placeholder="Serviços de Terceiros" />
                </div>
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Input disabled={!canManage} name="supplierIdentifier" placeholder="CNPJ ou código" />
                </div>
                <div className="space-y-2">
                  <Label>Nome do fornecedor</Label>
                  <Input disabled={!canManage} name="supplierName" placeholder="Nome fantasia" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label>Data de emissão</Label>
                  <Input disabled={!canManage} name="issueDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Data de vencimento</Label>
                  <Input disabled={!canManage} name="dueDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Valor do título</Label>
                  <Input defaultValue={0} disabled={!canManage} name="titleAmountCents" type="number" />
                </div>
                <div className="space-y-2">
                  <Label>Acréscimos</Label>
                  <Input defaultValue={0} disabled={!canManage} name="additionalAmountCents" type="number" />
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Rateio por natureza e centro de custo</p>
                    <p className="text-sm text-muted-foreground">
                      Se não preencher, o sistema lança 100% no centro de custo e natureza principais.
                    </p>
                  </div>
                  <Button
                    disabled={!canManage || costCenters.length === 0}
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAllocations((current) => [
                        ...current,
                        {
                          costCenterId: costCenters[0]?.id ?? "",
                          natureDescription: "",
                          amountCents: "0"
                        }
                      ]);
                    }}
                  >
                    Adicionar rateio
                  </Button>
                </div>

                <div className="space-y-3">
                  {allocations.map((allocation, index) => (
                    <div key={`${index}-${allocation.costCenterId}`} className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_160px_90px]">
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        disabled={!canManage || costCenters.length === 0}
                        value={allocation.costCenterId}
                        onChange={(event) => {
                          setAllocations((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, costCenterId: event.target.value }
                                : item
                            )
                          );
                        }}
                      >
                        {costCenters.length === 0 ? <option value="">Crie um centro de custo</option> : null}
                        {costCenters.map((costCenter) => (
                          <option key={costCenter.id} value={costCenter.id}>
                            {costCenter.code} · {costCenter.name}
                          </option>
                        ))}
                      </select>
                      <Input
                        disabled={!canManage}
                        placeholder="Natureza do rateio"
                        value={allocation.natureDescription}
                        onChange={(event) => {
                          setAllocations((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, natureDescription: event.target.value }
                                : item
                            )
                          );
                        }}
                      />
                      <Input
                        disabled={!canManage}
                        placeholder="Valor"
                        type="number"
                        value={allocation.amountCents}
                        onChange={(event) => {
                          setAllocations((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, amountCents: event.target.value }
                                : item
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
                          setAllocations((current) => current.filter((_, itemIndex) => itemIndex !== index));
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea disabled={!canManage} name="notes" placeholder="Histórico interno, observações da NF, RC ou aprovação..." />
              </div>

              <Button disabled={!canManage || costCenters.length === 0} type="submit">Cadastrar título</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Tela inicial de contas a pagar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-2 xl:col-span-2">
              <Label>Pesquisar</Label>
              <Input
                placeholder="Nº do título, fornecedor, nome ou natureza"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="ALL">Todos</option>
                {payableStatuses.map((status) => (
                  <option key={status} value={status}>{formatTokenLabel(status)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Documento</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={documentTypeFilter} onChange={(event) => setDocumentTypeFilter(event.target.value)}>
                <option value="ALL">Todos</option>
                {documentTypes.map((documentType) => (
                  <option key={documentType} value={documentType}>{documentType}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Centro de custo</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={costCenterFilter} onChange={(event) => setCostCenterFilter(event.target.value)}>
                <option value="ALL">Todos</option>
                {costCenters.map((costCenter) => (
                  <option key={costCenter.id} value={costCenter.id}>
                    {costCenter.code} · {costCenter.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Ordenar por</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="actualDueDate">Vencimento real</option>
                <option value="supplierName">Fornecedor</option>
                <option value="totalAmountCents">Maior valor</option>
                <option value="titleNumber">Nº do título</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              checked={onlyOverdue}
              className="h-4 w-4"
              type="checkbox"
              onChange={(event) => setOnlyOverdue(event.target.checked)}
            />
            Mostrar apenas títulos vencidos
          </label>

          {filteredTitles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum título encontrado com os filtros atuais.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Natureza</TableHead>
                    <TableHead>Centro de custo</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Vencimento real</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Aberto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Baixa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTitles.map((title) => {
                    const openAmountCents = Math.max(title.totalAmountCents - title.paidAmountCents, 0);

                    return (
                      <TableRow key={title.id} className="align-top">
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{title.prefix} · {title.titleNumber}</p>
                            <p className="text-xs text-muted-foreground">{title.documentType}</p>
                            {title.project?.name ? <p className="text-xs text-muted-foreground">{title.project.name}</p> : null}
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
                        <TableCell>{new Date(title.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(title.actualDueDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p>{formatCurrency(title.totalAmountCents)}</p>
                            {title.additionalAmountCents > 0 ? (
                              <p className="text-xs text-muted-foreground">Acréscimo: {formatCurrency(title.additionalAmountCents)}</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(openAmountCents)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(title.status)}>{formatTokenLabel(title.status)}</Badge>
                        </TableCell>
                        <TableCell className="min-w-[320px]">
                          <details className="group">
                            <summary className="cursor-pointer text-sm font-medium text-sky-600 marker:hidden">
                              Ver rateio e baixar
                            </summary>
                            <div className="mt-3 space-y-4 rounded-2xl border p-3">
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Rateio</p>
                                <div className="space-y-2">
                                  {title.allocations.map((allocation) => (
                                    <div key={allocation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
                                      <span>{allocation.costCenter.code} · {allocation.costCenter.name}</span>
                                      <span>{allocation.natureDescription}</span>
                                      <span className="font-medium">{formatCurrency(allocation.amountCents)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <p className="text-sm font-medium">Baixas registradas</p>
                                {title.payments.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Nenhuma baixa registrada.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {title.payments.map((payment) => (
                                      <div key={payment.id} className="rounded-xl border px-3 py-2 text-sm">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <span>{formatTokenLabel(payment.paymentType)}</span>
                                          <span className="font-medium">{formatCurrency(payment.amountPaidCents)}</span>
                                        </div>
                                        <p className="mt-1 text-muted-foreground">
                                          {new Date(payment.paymentDate).toLocaleDateString()} · Multa {formatCurrency(payment.fineCents)} · Juros {formatCurrency(payment.interestCents)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <form
                                className="grid gap-3"
                                onSubmit={(event) => {
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
                                  }, "Baixa registrada.");
                                  event.currentTarget.reset();
                                }}
                              >
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>Tipo de pagamento</Label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={PayablePaymentType.TRANSFER} disabled={!canManage} name="paymentType">
                                      {paymentTypes.map((paymentType) => (
                                        <option key={paymentType} value={paymentType}>{formatTokenLabel(paymentType)}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Data do pagamento</Label>
                                    <Input disabled={!canManage} name="paymentDate" type="date" />
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
                                    <Label>Multa</Label>
                                    <Input defaultValue={0} disabled={!canManage} name="fineCents" type="number" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Juros</Label>
                                    <Input defaultValue={0} disabled={!canManage} name="interestCents" type="number" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Valor baixado</Label>
                                    <Input defaultValue={openAmountCents} disabled={!canManage} name="amountPaidCents" type="number" />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Histórico</Label>
                                  <Textarea disabled={!canManage} name="history" placeholder="Histórico da baixa" />
                                </div>
                                <Button disabled={!canManage || title.status === PayableTitleStatus.PAID || title.status === PayableTitleStatus.CANCELED} size="sm" type="submit">
                                  Registrar baixa
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

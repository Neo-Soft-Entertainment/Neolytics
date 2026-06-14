"use client";

import { ApprovalStatus, ConsentStatus, DataProductType, DataSubjectRequestStatus, DataSubjectRequestType, PrivacyIncidentSeverity, PrivacyIncidentStatus } from "@prisma/client";
import { startTransition, useState } from "react";

import type { ProcessingPurposeDefinition } from "@/lib/privacy/processing-purposes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type ConsentItem = {
  purpose: ProcessingPurposeDefinition;
  consent: null | {
    id: string;
    status: ConsentStatus;
    consentTextVersion: string;
    grantedAt: string;
    revokedAt: string | null;
  };
};

type RequestItem = {
  id: string;
  requestType: DataSubjectRequestType;
  status: DataSubjectRequestStatus;
  reason: string | null;
  dueAt: string;
  createdAt: string;
  completedAt: string | null;
};

type AdminRequestItem = RequestItem & {
  user: {
    email: string;
    name: string | null;
  };
  handledBy: {
    email: string;
    name: string | null;
  } | null;
};

type AdminProductItem = {
  id: string;
  productName: string;
  productType: DataProductType;
  approvalStatus: ApprovalStatus;
  minimumCohortSize: number;
  privacyRiskScore: number;
};

type AdminIncidentItem = {
  id: string;
  severity: PrivacyIncidentSeverity;
  status: PrivacyIncidentStatus;
  discoveredAt: string;
};

type AdminAuditItem = {
  id: string;
  action: string;
  resourceType: string;
  decision: string | null;
  createdAt: string;
};

type PrivacyPanelProps = {
  consents: ConsentItem[];
  requests: RequestItem[];
  purposes: ProcessingPurposeDefinition[];
  supportEmail: string | null;
  canAdmin: boolean;
  adminSnapshot: null | {
    stats: {
      consents: number;
      requests: number;
      products: number;
      incidents: number;
      auditLogs: number;
      legalHolds: number;
    };
    requests: AdminRequestItem[];
    products: AdminProductItem[];
    incidents: AdminIncidentItem[];
    auditLogs: AdminAuditItem[];
  };
};

function getBadgeVariant(status: string) {
  if (status === "GRANTED" || status === "COMPLETED" || status === "APPROVED" || status === "RESOLVED") {
    return "default";
  }

  if (status === "REVOKED" || status === "REJECTED" || status === "BLOCK") {
    return "destructive";
  }

  return "secondary";
}

function formatDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
}

async function readJson(response: Response) {
  return (await response.json().catch(() => null)) as { message?: string } | null;
}

export function PrivacyPanel({
  consents: initialConsents,
  requests: initialRequests,
  purposes,
  supportEmail,
  canAdmin,
  adminSnapshot
}: PrivacyPanelProps) {
  const [consents, setConsents] = useState(initialConsents);
  const [requests, setRequests] = useState(initialRequests);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incidentSeverity, setIncidentSeverity] = useState<PrivacyIncidentSeverity>(PrivacyIncidentSeverity.MEDIUM);
  const [incidentCategories, setIncidentCategories] = useState("PERSONAL");
  const [incidentRootCause, setIncidentRootCause] = useState("");
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState<DataProductType>(DataProductType.AGGREGATED_INSIGHTS);
  const [sourceTables, setSourceTables] = useState("usage_metrics");
  const [outputFields, setOutputFields] = useState("weekly_region_segment_metrics");

  async function grantConsentForPurpose(purposeId: string) {
    setFeedback(null);
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/privacy/consents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        purposeId,
        consentTextVersion: "v1",
        source: "privacy_settings"
      })
    });

    const payload = await readJson(response);
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload?.message ?? "Não foi possível conceder o consentimento.");
      return;
    }

    setConsents((current: any) =>
      current.map((item: any) =>
        {
        let resolvedValue0: any;
        if (item.purpose.purposeId === purposeId) {
          resolvedValue0 = {
              ...item,
              consent: {
                id: (payload as { id: string }).id,
                status: ConsentStatus.GRANTED,
                consentTextVersion: "v1",
                grantedAt: new Date().toISOString(),
                revokedAt: null
              }
            };
        } else {
          resolvedValue0 = item;
        }
        return resolvedValue0;
      }
      )
    );
    setFeedback("Consentimento concedido.");
  }

  async function revokeConsentForPurpose(purposeId: string) {
    const confirmed = window.confirm("Revogar este consentimento agora?");

    if (!confirmed) {
      return;
    }

    setFeedback(null);
    setError(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/privacy/consents/${purposeId}`, {
      method: "PATCH"
    });
    const payload = await readJson(response);
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload?.message ?? "Não foi possível revogar o consentimento.");
      return;
    }

    setConsents((current: any) =>
      current.map((item: any) =>
        {
        let resolvedValue1: any;
        if (item.purpose.purposeId === purposeId && item.consent) {
          resolvedValue1 = {
              ...item,
              consent: {
                ...item.consent,
                status: ConsentStatus.REVOKED,
                revokedAt: new Date().toISOString()
              }
            };
        } else {
          resolvedValue1 = item;
        }
        return resolvedValue1;
      }
      )
    );
    setFeedback("Consentimento revogado.");
  }

  async function createRequest(requestType: DataSubjectRequestType) {
    const reason = window.prompt("Adicione um motivo curto para esta solicitação de privacidade.", "")?.trim() ?? "";

    setFeedback(null);
    setError(null);
    setIsSubmitting(true);

        let resolvedValue2: any;
    if (reason.length > 0) {
      resolvedValue2 = reason;
    } else {
      resolvedValue2 = undefined;
    }
const response = await fetch("/api/privacy/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requestType,
        reason: resolvedValue2
      })
    });
    const payload = await readJson(response);
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload?.message ?? "Não foi possível criar a solicitação de privacidade.");
      return;
    }

    setRequests((current: any) => [
      {
        ...(payload as RequestItem),
        createdAt: (payload as RequestItem).createdAt,
        dueAt: (payload as RequestItem).dueAt,
        completedAt: null
      },
      ...current
    ]);
    setFeedback("Solicitação de privacidade enviada.");
  }

  async function downloadJsonFile(url: string, fileName: string) {
    setFeedback(null);
    setError(null);
    const response = await fetch(url);
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setError((payload as { message?: string } | null)?.message ?? "Não foi possível baixar os dados.");
      return;
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(objectUrl);
    setFeedback("Download iniciado.");
  }

  async function reviewRequest(requestId: string, status: DataSubjectRequestStatus) {
    const confirmed = window.confirm(`Marcar esta solicitação como ${status.toLowerCase()}?`);

    if (!confirmed) {
      return;
    }

        let resolvedValue3: any;
    if (status === DataSubjectRequestStatus.COMPLETED) {
      resolvedValue3 = "Revisada pelo administrador de privacidade.";
    } else {
      resolvedValue3 = "Rejeitada pelo administrador de privacidade.";
    }
const response = await fetch(`/api/privacy/admin/requests/${requestId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status,
        resolution: resolvedValue3
      })
    });
    const payload = await readJson(response);

    if (!response.ok) {
      setError(payload?.message ?? "Não foi possível revisar a solicitação.");
      return;
    }

    setFeedback("Solicitação de privacidade atualizada.");
  }

  async function createIncident() {
    setFeedback(null);
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/privacy/admin/incidents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        severity: incidentSeverity,
        affectedDataCategories: incidentCategories.split(",").map((item: any) => item.trim()).filter(Boolean),
        rootCause: incidentRootCause,
        status: PrivacyIncidentStatus.OPEN
      })
    });
    const payload = await readJson(response);
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload?.message ?? "Não foi possível criar o incidente.");
      return;
    }

    setIncidentRootCause("");
    setFeedback("Incidente registrado.");
  }

  async function createProduct() {
    setFeedback(null);
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/privacy/admin/data-products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        productName,
        productType,
        description: `Produto de dados ${productType}`,
        sourceTables: sourceTables.split(",").map((item: any) => item.trim()).filter(Boolean),
        outputFields: outputFields.split(",").map((item: any) => item.trim()).filter(Boolean),
        minimumCohortSize: 100,
        privacyRiskScore: 40
      })
    });
    const payload = await readJson(response);
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload?.message ?? "Não foi possível criar o produto de dados.");
      return;
    }

    setProductName("");
    setFeedback("Produto de dados criado.");
  }

  async function approveProduct(productId: string, approvalStatus: ApprovalStatus) {
    const response = await fetch(`/api/privacy/admin/data-products/${productId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        approvalStatus,
        exportAllowed: approvalStatus === ApprovalStatus.APPROVED,
        buyerContractAccepted: approvalStatus === ApprovalStatus.APPROVED
      })
    });
    const payload = await readJson(response);

    if (!response.ok) {
      setError(payload?.message ?? "Não foi possível atualizar a aprovação do produto.");
      return;
    }

    setFeedback("Aprovação do produto de dados atualizada.");
  }

  const activeConsents = consents.filter((item: any) => item.consent?.status === ConsentStatus.GRANTED).length;
  const openRequests = requests.filter((item: any) => item.status === DataSubjectRequestStatus.OPEN || item.status === DataSubjectRequestStatus.IN_REVIEW).length;

    let resolvedValue4: any;
  if (canAdmin) {
    resolvedValue4 = "md:grid-cols-4";
  } else {
    resolvedValue4 = "md:grid-cols-3";
  }
  let resolvedValue5: any;
  if (canAdmin) {
    resolvedValue5 = <TabsTrigger value="admin">Administração</TabsTrigger>;
  } else {
    resolvedValue5 = null;
  }
  let resolvedValue7: any;
  if (canAdmin && adminSnapshot) {
    resolvedValue7 = (
        <TabsContent value="admin" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Consentimentos</p><p className="mt-2 text-2xl font-semibold">{adminSnapshot.stats.consents}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Solicitações</p><p className="mt-2 text-2xl font-semibold">{adminSnapshot.stats.requests}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Incidentes</p><p className="mt-2 text-2xl font-semibold">{adminSnapshot.stats.incidents}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Retenções legais</p><p className="mt-2 text-2xl font-semibold">{adminSnapshot.stats.legalHolds}</p></CardContent></Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Registrar incidente</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="space-y-2">
                  <Label>Severidade</Label>
                  <Select value={incidentSeverity} onValueChange={(value: any) => setIncidentSeverity(value as PrivacyIncidentSeverity)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.values(PrivacyIncidentSeverity).map((severity) => (
                        <SelectItem key={severity} value={severity}>{severity}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categorias afetadas</Label>
                  <Input value={incidentCategories} onChange={(event: any) => setIncidentCategories(event.target.value)} placeholder="PERSONAL, SENSITIVE_PERSONAL" />
                </div>
                <div className="space-y-2">
                  <Label>Causa raiz</Label>
                  <Textarea value={incidentRootCause} onChange={(event: any) => setIncidentRootCause(event.target.value)} placeholder="Resumo curto do incidente" />
                </div>
                <Button disabled={isSubmitting || incidentRootCause.trim().length < 2} onClick={createIncident}>Criar incidente</Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Criar produto de dados</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={productName} onChange={(event: any) => setProductName(event.target.value)} placeholder="Pulso semanal de mercado" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={productType} onValueChange={(value: any) => setProductType(value as DataProductType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[
                        DataProductType.AGGREGATED_INSIGHTS,
                        DataProductType.ANONYMIZED_STATISTICS,
                        DataProductType.COHORT_REPORT,
                        DataProductType.SYNTHETIC_DATASET
                      ].map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tabelas de origem</Label>
                  <Input value={sourceTables} onChange={(event: any) => setSourceTables(event.target.value)} placeholder="usage_metrics, cohort_rollups" />
                </div>
                <div className="space-y-2">
                  <Label>Campos de saída</Label>
                  <Input value={outputFields} onChange={(event: any) => setOutputFields(event.target.value)} placeholder="weekly_region_segment_metrics, revenue" />
                </div>
                <Button disabled={isSubmitting || productName.trim().length < 2} onClick={createProduct}>Criar produto</Button>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Solicitações de titulares de dados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminSnapshot.requests.slice(0, 8).map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.user.name ?? item.user.email}</TableCell>
                      <TableCell>{item.requestType}</TableCell>
                      <TableCell><Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge></TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => reviewRequest(item.id, DataSubjectRequestStatus.COMPLETED)}>Concluir</Button>
                        <Button size="sm" variant="outline" onClick={() => reviewRequest(item.id, DataSubjectRequestStatus.REJECTED)}>Rejeitar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Produtos de dados</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminSnapshot.products.slice(0, 8).map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell><Badge variant={getBadgeVariant(item.approvalStatus)}>{item.approvalStatus}</Badge></TableCell>
                        <TableCell>{item.privacyRiskScore}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => approveProduct(item.id, ApprovalStatus.APPROVED)}>Aprovar</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Incidentes e auditoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {adminSnapshot.incidents.slice(0, 4).map((incident) => (
                    <div key={incident.id} className="rounded-[1rem] border border-white/10 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span>{incident.severity}</span>
                        <Badge variant={getBadgeVariant(incident.status)}>{incident.status}</Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">{formatDate(incident.discoveredAt)}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {adminSnapshot.auditLogs.slice(0, 4).map((log) => (
                    <div key={log.id} className="rounded-[1rem] border border-white/10 p-3 text-sm">
                      <p className="font-medium">{log.action}</p>
                      <p className="mt-1 text-muted-foreground">{log.resourceType} · {formatDate(log.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      );
  } else {
    resolvedValue7 = null;
  }
  let resolvedValue8: any;
  if (feedback) {
    resolvedValue8 = <p className="text-sm text-emerald-600">{feedback}</p>;
  } else {
    resolvedValue8 = null;
  }
  let resolvedValue9: any;
  if (error) {
    resolvedValue9 = <p className="text-sm text-destructive">{error}</p>;
  } else {
    resolvedValue9 = null;
  }
return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className={`grid h-auto w-full grid-cols-1 gap-2 rounded-[1rem] border border-white/10 bg-white/55 p-1.5 backdrop-blur ${resolvedValue4} dark:bg-white/[0.04]`}>
        <TabsTrigger value="overview">Visão geral</TabsTrigger>
        <TabsTrigger value="consents">Consentimentos</TabsTrigger>
        <TabsTrigger value="requests">Solicitações</TabsTrigger>
        {resolvedValue5}
      </TabsList>
      <p className="text-sm text-muted-foreground">
        Revise postura de privacidade, registros de consentimento, solicitações de dados e controles administrativos em um só lugar.
      </p>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Consentimentos ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{activeConsents}</p>
              <p className="mt-1 text-sm text-muted-foreground">Finalidades opcionais ativas no momento.</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Solicitações de privacidade</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{openRequests}</p>
              <p className="mt-1 text-sm text-muted-foreground">Abertas ou em revisão.</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Finalidades de processamento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{purposes.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Finalidades legais registradas.</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Suporte de privacidade</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{supportEmail ?? "Contate o administrador da área de trabalho"}</p>
              <p className="mt-1 text-sm text-muted-foreground">Use este canal para suporte e acompanhamento de LGPD.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Mapa de dados e finalidades legais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {purposes.map((purpose) => (
              <details key={purpose.purposeId} className="rounded-[1rem] border border-white/10 p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {purpose.purposeName}
                </summary>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <p>{purpose.description}</p>
                  <p>Base legal: {purpose.legalBasis}</p>
                  <p>Retenção: {purpose.retentionPeriodDays} dias</p>
                  <p>Risco: {purpose.riskLevel}</p>
                </div>
              </details>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="consents" className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Consentimentos opcionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {consents.map((item: any) => {
              let resolvedValue6: any;
              if (item.consent?.status === ConsentStatus.GRANTED) {
                resolvedValue6 = (
                    <Button disabled={isSubmitting} variant="outline" onClick={() => revokeConsentForPurpose(item.purpose.purposeId)}>
                      Revogar
                    </Button>
                  );
              } else {
                resolvedValue6 = (
                    <Button disabled={isSubmitting} onClick={() => grantConsentForPurpose(item.purpose.purposeId)}>
                      Conceder
                    </Button>
                  );
              }
              return (
              <div key={item.purpose.purposeId} className="rounded-[1rem] border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.purpose.purposeName}</p>
                      <Badge variant={getBadgeVariant(item.consent?.status ?? "PENDING")}>
                        {item.consent?.status ?? "PENDING"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.purpose.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Versão: {item.consent?.consentTextVersion ?? "v1"} · Última alteração: {formatDate(item.consent?.revokedAt ?? item.consent?.grantedAt ?? null)}
                    </p>
                  </div>
                  {resolvedValue6}
                </div>
              </div>
            );
            })}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="requests" className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Ações de privacidade</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button disabled={isSubmitting} size="sm" onClick={() => createRequest(DataSubjectRequestType.ACCESS_PERSONAL_DATA)}>Solicitar acesso</Button>
            <Button disabled={isSubmitting} size="sm" variant="outline" onClick={() => createRequest(DataSubjectRequestType.EXPORT_PORTABILITY)}>Solicitar exportação</Button>
            <Button disabled={isSubmitting} size="sm" variant="outline" onClick={() => createRequest(DataSubjectRequestType.DELETE_PERSONAL_DATA)}>Solicitar exclusão</Button>
            <Button disabled={isSubmitting} size="sm" variant="outline" onClick={() => createRequest(DataSubjectRequestType.ANONYMIZE_OR_BLOCK_DATA)}>Anonimizar ou bloquear</Button>
            <Button size="sm" variant="outline" onClick={() => downloadJsonFile("/api/privacy/export-package", "privacy-export-package.json")}>Baixar meus dados</Button>
            <Button size="sm" variant="outline" onClick={() => downloadJsonFile("/api/privacy/consents/history", "consent-history.json")}>Histórico de consentimento</Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Histórico de solicitações</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead>Prazo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.requestType}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(item.createdAt)}</TableCell>
                    <TableCell>{formatDate(item.dueAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {resolvedValue7}

      {resolvedValue8}
      {resolvedValue9}
    </Tabs>
  );
}

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
      setError(payload?.message ?? "Unable to grant consent.");
      return;
    }

    setConsents((current) =>
      current.map((item) =>
        item.purpose.purposeId === purposeId
          ? {
              ...item,
              consent: {
                id: (payload as { id: string }).id,
                status: ConsentStatus.GRANTED,
                consentTextVersion: "v1",
                grantedAt: new Date().toISOString(),
                revokedAt: null
              }
            }
          : item
      )
    );
    setFeedback("Consent granted.");
  }

  async function revokeConsentForPurpose(purposeId: string) {
    const confirmed = window.confirm("Revoke this consent now?");

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
      setError(payload?.message ?? "Unable to revoke consent.");
      return;
    }

    setConsents((current) =>
      current.map((item) =>
        item.purpose.purposeId === purposeId && item.consent
          ? {
              ...item,
              consent: {
                ...item.consent,
                status: ConsentStatus.REVOKED,
                revokedAt: new Date().toISOString()
              }
            }
          : item
      )
    );
    setFeedback("Consent revoked.");
  }

  async function createRequest(requestType: DataSubjectRequestType) {
    const reason = window.prompt("Add a short reason for this privacy request.", "")?.trim() ?? "";

    setFeedback(null);
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/privacy/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requestType,
        reason: reason.length > 0 ? reason : undefined
      })
    });
    const payload = await readJson(response);
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload?.message ?? "Unable to create privacy request.");
      return;
    }

    setRequests((current) => [
      {
        ...(payload as RequestItem),
        createdAt: (payload as RequestItem).createdAt,
        dueAt: (payload as RequestItem).dueAt,
        completedAt: null
      },
      ...current
    ]);
    setFeedback("Privacy request submitted.");
  }

  async function downloadJsonFile(url: string, fileName: string) {
    setFeedback(null);
    setError(null);
    const response = await fetch(url);
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setError((payload as { message?: string } | null)?.message ?? "Unable to download data.");
      return;
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(objectUrl);
    setFeedback("Download started.");
  }

  async function reviewRequest(requestId: string, status: DataSubjectRequestStatus) {
    const confirmed = window.confirm(`Mark this request as ${status.toLowerCase()}?`);

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/privacy/admin/requests/${requestId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status,
        resolution: status === DataSubjectRequestStatus.COMPLETED ? "Reviewed by privacy admin." : "Rejected by privacy admin."
      })
    });
    const payload = await readJson(response);

    if (!response.ok) {
      setError(payload?.message ?? "Unable to review request.");
      return;
    }

    setFeedback("Privacy request updated.");
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
        affectedDataCategories: incidentCategories.split(",").map((item) => item.trim()).filter(Boolean),
        rootCause: incidentRootCause,
        status: PrivacyIncidentStatus.OPEN
      })
    });
    const payload = await readJson(response);
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload?.message ?? "Unable to create incident.");
      return;
    }

    setIncidentRootCause("");
    setFeedback("Incident recorded.");
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
        description: `${productType} data product`,
        sourceTables: sourceTables.split(",").map((item) => item.trim()).filter(Boolean),
        outputFields: outputFields.split(",").map((item) => item.trim()).filter(Boolean),
        minimumCohortSize: 100,
        privacyRiskScore: 40
      })
    });
    const payload = await readJson(response);
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload?.message ?? "Unable to create data product.");
      return;
    }

    setProductName("");
    setFeedback("Data product created.");
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
      setError(payload?.message ?? "Unable to update product approval.");
      return;
    }

    setFeedback("Data product approval updated.");
  }

  const activeConsents = consents.filter((item) => item.consent?.status === ConsentStatus.GRANTED).length;
  const openRequests = requests.filter((item) => item.status === DataSubjectRequestStatus.OPEN || item.status === DataSubjectRequestStatus.IN_REVIEW).length;

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className={`grid h-auto w-full grid-cols-1 gap-2 rounded-[1rem] border border-white/10 bg-white/55 p-1.5 backdrop-blur ${canAdmin ? "md:grid-cols-4" : "md:grid-cols-3"} dark:bg-white/[0.04]`}>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="consents">Consents</TabsTrigger>
        <TabsTrigger value="requests">Requests</TabsTrigger>
        {canAdmin ? <TabsTrigger value="admin">Admin</TabsTrigger> : null}
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Active consents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{activeConsents}</p>
              <p className="mt-1 text-sm text-muted-foreground">Optional purposes currently enabled.</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Privacy requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{openRequests}</p>
              <p className="mt-1 text-sm text-muted-foreground">Open or in review.</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Processing purposes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{purposes.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Registered legal purposes.</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Privacy support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{supportEmail ?? "Contact your workspace admin"}</p>
              <p className="mt-1 text-sm text-muted-foreground">Use this channel for LGPD support and follow-up.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Data map and legal purposes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {purposes.map((purpose) => (
              <details key={purpose.purposeId} className="rounded-[1rem] border border-white/10 p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {purpose.purposeName}
                </summary>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <p>{purpose.description}</p>
                  <p>Legal basis: {purpose.legalBasis}</p>
                  <p>Retention: {purpose.retentionPeriodDays} days</p>
                  <p>Risk: {purpose.riskLevel}</p>
                </div>
              </details>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="consents" className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Optional consents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {consents.map((item) => (
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
                      Version: {item.consent?.consentTextVersion ?? "v1"} · Last change: {formatDate(item.consent?.revokedAt ?? item.consent?.grantedAt ?? null)}
                    </p>
                  </div>
                  {item.consent?.status === ConsentStatus.GRANTED ? (
                    <Button disabled={isSubmitting} variant="outline" onClick={() => revokeConsentForPurpose(item.purpose.purposeId)}>
                      Revoke
                    </Button>
                  ) : (
                    <Button disabled={isSubmitting} onClick={() => grantConsentForPurpose(item.purpose.purposeId)}>
                      Grant
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="requests" className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Privacy actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button disabled={isSubmitting} size="sm" onClick={() => createRequest(DataSubjectRequestType.ACCESS_PERSONAL_DATA)}>Request access</Button>
            <Button disabled={isSubmitting} size="sm" variant="outline" onClick={() => createRequest(DataSubjectRequestType.EXPORT_PORTABILITY)}>Request export</Button>
            <Button disabled={isSubmitting} size="sm" variant="outline" onClick={() => createRequest(DataSubjectRequestType.DELETE_PERSONAL_DATA)}>Request deletion</Button>
            <Button disabled={isSubmitting} size="sm" variant="outline" onClick={() => createRequest(DataSubjectRequestType.ANONYMIZE_OR_BLOCK_DATA)}>Anonymize or block</Button>
            <Button size="sm" variant="outline" onClick={() => downloadJsonFile("/api/privacy/export-package", "privacy-export-package.json")}>Download my data</Button>
            <Button size="sm" variant="outline" onClick={() => downloadJsonFile("/api/privacy/consents/history", "consent-history.json")}>Consent history</Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Request history</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((item) => (
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

      {canAdmin && adminSnapshot ? (
        <TabsContent value="admin" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Consents</p><p className="mt-2 text-2xl font-semibold">{adminSnapshot.stats.consents}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Requests</p><p className="mt-2 text-2xl font-semibold">{adminSnapshot.stats.requests}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Incidents</p><p className="mt-2 text-2xl font-semibold">{adminSnapshot.stats.incidents}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Retention holds</p><p className="mt-2 text-2xl font-semibold">{adminSnapshot.stats.legalHolds}</p></CardContent></Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Record incident</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select value={incidentSeverity} onValueChange={(value) => setIncidentSeverity(value as PrivacyIncidentSeverity)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.values(PrivacyIncidentSeverity).map((severity) => (
                        <SelectItem key={severity} value={severity}>{severity}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Affected categories</Label>
                  <Input value={incidentCategories} onChange={(event) => setIncidentCategories(event.target.value)} placeholder="PERSONAL, SENSITIVE_PERSONAL" />
                </div>
                <div className="space-y-2">
                  <Label>Root cause</Label>
                  <Textarea value={incidentRootCause} onChange={(event) => setIncidentRootCause(event.target.value)} placeholder="Short incident summary" />
                </div>
                <Button disabled={isSubmitting || incidentRootCause.trim().length < 2} onClick={createIncident}>Create incident</Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Create data product</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Weekly market pulse" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={productType} onValueChange={(value) => setProductType(value as DataProductType)}>
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
                  <Label>Source tables</Label>
                  <Input value={sourceTables} onChange={(event) => setSourceTables(event.target.value)} placeholder="usage_metrics, cohort_rollups" />
                </div>
                <div className="space-y-2">
                  <Label>Output fields</Label>
                  <Input value={outputFields} onChange={(event) => setOutputFields(event.target.value)} placeholder="weekly_region_segment_metrics, revenue" />
                </div>
                <Button disabled={isSubmitting || productName.trim().length < 2} onClick={createProduct}>Create product</Button>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Data subject requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminSnapshot.requests.slice(0, 8).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.user.name ?? item.user.email}</TableCell>
                      <TableCell>{item.requestType}</TableCell>
                      <TableCell><Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge></TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => reviewRequest(item.id, DataSubjectRequestStatus.COMPLETED)}>Complete</Button>
                        <Button size="sm" variant="outline" onClick={() => reviewRequest(item.id, DataSubjectRequestStatus.REJECTED)}>Reject</Button>
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
                <CardTitle>Data products</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminSnapshot.products.slice(0, 8).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell><Badge variant={getBadgeVariant(item.approvalStatus)}>{item.approvalStatus}</Badge></TableCell>
                        <TableCell>{item.privacyRiskScore}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => approveProduct(item.id, ApprovalStatus.APPROVED)}>Approve</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Incidents and audit</CardTitle>
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
      ) : null}

      {feedback ? <p className="text-sm text-emerald-600">{feedback}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </Tabs>
  );
}

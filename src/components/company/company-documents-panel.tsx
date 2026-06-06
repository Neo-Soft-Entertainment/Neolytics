"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CompanyDocumentRecord, CompanyLegalEntityRecord, CompanyProjectOption } from "@/components/company/company-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const documentTypes = [
  "CNPJ_CARD",
  "ARTICLES_OF_ASSOCIATION",
  "CONTRACT_AMENDMENT",
  "STATE_REGISTRATION",
  "MUNICIPAL_REGISTRATION",
  "TAX_CERTIFICATE",
  "TRADEMARK",
  "LICENSE",
  "NDA",
  "PUBLISHING_CONTRACT",
  "INVESTMENT_CONTRACT",
  "ACCOUNTING_RECORD",
  "OTHER"
] as const;

export function CompanyDocumentsPanel({
  documents,
  legalEntities,
  projects,
  canManage
}: {
  documents: CompanyDocumentRecord[];
  legalEntities: CompanyLegalEntityRecord[];
  projects: CompanyProjectOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function createDocument(formData: FormData) {
    if (!canManage) {
      return;
    }

    setError(null);
    setIsCreating(true);

    const response = await fetch("/api/company/documents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: formData.get("title"),
        type: formData.get("type"),
        legalEntityId: formData.get("legalEntityId") || undefined,
        projectId: formData.get("projectId") || undefined,
        issuer: formData.get("issuer"),
        documentNumber: formData.get("documentNumber"),
        expiresAt: formData.get("expiresAt") || undefined,
        storagePath: formData.get("storagePath"),
        originalName: formData.get("originalName"),
        mimeType: formData.get("mimeType")
      })
    });

    setIsCreating(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? "Unable to create document.");
      return;
    }

    const form = document.getElementById("create-company-document-form") as HTMLFormElement | null;
    form?.reset();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Document registry</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-4">
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Documents</p>
            <p className="mt-1 text-2xl font-semibold">{documents.length}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Expiring soon</p>
            <p className="mt-1 text-2xl font-semibold">
              {
                documents.filter((document) => {
                  if (!document.expiresAt) {
                    return false;
                  }

                  const expiresAt = new Date(document.expiresAt);
                  const thirtyDaysFromNow = new Date();
                  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                  return expiresAt <= thirtyDaysFromNow;
                }).length
              }
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Project-linked</p>
            <p className="mt-1 text-2xl font-semibold">{documents.filter((document) => document.project).length}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Versioned docs</p>
            <p className="mt-1 text-2xl font-semibold">{documents.filter((document) => document.versions.length > 1).length}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create document</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            id="create-company-document-form"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              void createDocument(new FormData(event.currentTarget));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="document-title">Title</Label>
              <Input disabled={!canManage || isCreating} id="document-title" name="title" placeholder="Comprovante de CNPJ" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-type">Type</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canManage || isCreating}
                id="document-type"
                name="type"
              >
                {documentTypes.map((documentType) => (
                  <option key={documentType} value={documentType}>
                    {documentType}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-entity">Legal entity</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canManage || isCreating}
                id="document-entity"
                name="legalEntityId"
              >
                <option value="">None</option>
                {legalEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-project">Project</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canManage || isCreating}
                id="document-project"
                name="projectId"
              >
                <option value="">None</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-issuer">Issuer</Label>
              <Input disabled={!canManage || isCreating} id="document-issuer" name="issuer" placeholder="Receita Federal" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-number">Document number</Label>
              <Input disabled={!canManage || isCreating} id="document-number" name="documentNumber" placeholder="Optional reference" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-expiration">Expires at</Label>
              <Input disabled={!canManage || isCreating} id="document-expiration" name="expiresAt" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-path">Storage path or URL</Label>
              <Input disabled={!canManage || isCreating} id="document-path" name="storagePath" placeholder="https://... or bucket/path.pdf" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-original-name">Original filename</Label>
              <Input disabled={!canManage || isCreating} id="document-original-name" name="originalName" placeholder="cnpj-card.pdf" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-mime-type">MIME type</Label>
              <Input disabled={!canManage || isCreating} id="document-mime-type" name="mimeType" placeholder="application/pdf" />
            </div>
            <div className="flex items-end">
              <Button disabled={!canManage || isCreating} type="submit">
                {isCreating ? "Creating..." : "Create document"}
              </Button>
            </div>
          </form>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {documents.map((document) => (
          <DocumentCard key={document.id} canManage={canManage} document={document} />
        ))}
        {documents.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              No company documents registered yet.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function DocumentCard({
  document,
  canManage
}: {
  document: CompanyDocumentRecord;
  canManage: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSavingVersion, setIsSavingVersion] = useState(false);

  async function addVersion(formData: FormData) {
    if (!canManage) {
      return;
    }

    setMessage(null);
    setIsSavingVersion(true);

    const response = await fetch(`/api/company/documents/${document.id}/versions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        storagePath: formData.get("storagePath"),
        originalName: formData.get("originalName"),
        mimeType: formData.get("mimeType")
      })
    });

    setIsSavingVersion(false);

    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setMessage(payload?.message ?? "Unable to add document version.");
      return;
    }

    setMessage("Document version added.");
    router.refresh();
  }

  const latestVersion = document.versions[0];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>{document.title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {document.legalEntity?.name || "No company link"} · {document.project?.name || "No project link"}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{document.type}</Badge>
          <Badge variant={document.status === "ACTIVE" ? "default" : "secondary"}>{document.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm md:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Issuer</p>
            <p>{document.issuer || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Document number</p>
            <p>{document.documentNumber || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Expires</p>
            <p>{document.expiresAt ? new Date(document.expiresAt).toLocaleDateString() : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Latest version</p>
            <p>v{latestVersion?.version ?? 1}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {document.versions.map((version) => (
              <TableRow key={version.id}>
                <TableCell>v{version.version}</TableCell>
                <TableCell>{version.originalName}</TableCell>
                <TableCell className="max-w-[280px] truncate">{version.storagePath}</TableCell>
                <TableCell>{new Date(version.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            void addVersion(new FormData(event.currentTarget));
          }}
        >
          <div className="space-y-2">
            <Label>New storage path</Label>
            <Input disabled={!canManage || isSavingVersion} name="storagePath" placeholder="bucket/path-v2.pdf" />
          </div>
          <div className="space-y-2">
            <Label>Original filename</Label>
            <Input disabled={!canManage || isSavingVersion} name="originalName" placeholder="cnpj-card-v2.pdf" />
          </div>
          <div className="space-y-2">
            <Label>MIME type</Label>
            <Input disabled={!canManage || isSavingVersion} name="mimeType" placeholder="application/pdf" />
          </div>
          <div className="md:col-span-3">
            <Button disabled={!canManage || isSavingVersion} size="sm" type="submit">
              {isSavingVersion ? "Saving..." : "Add new version"}
            </Button>
          </div>
        </form>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

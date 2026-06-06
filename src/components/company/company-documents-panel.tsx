"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { CompanyDocumentRecord, CompanyLegalEntityRecord, CompanyProjectOption } from "@/components/company/company-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDocumentTypeLabel } from "@/lib/company-localization";

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
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      if (typeFilter !== "ALL" && document.type !== typeFilter) {
        return false;
      }

      if (!query.trim()) {
        return true;
      }

      const haystack = [
        document.title,
        document.type,
        document.issuer,
        document.documentNumber,
        document.legalEntity?.name,
        document.project?.name,
        document.versions[0]?.originalName
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query.trim().toLowerCase());
    });
  }, [documents, query, typeFilter]);

  async function createDocument(formData: FormData) {
    if (!canManage) {
      return;
    }

    setError(null);
    setIsCreating(true);

    const response = await fetch("/api/company/documents", {
      method: "POST",
      body: formData
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
              <Input disabled={!canManage || isCreating} id="document-title" name="title" placeholder="Business registration certificate" />
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
                    {getDocumentTypeLabel(documentType)}
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
              <Input disabled={!canManage || isCreating} id="document-issuer" name="issuer" placeholder="Government registry or issuing authority" />
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
              <Label htmlFor="document-file">File</Label>
              <Input disabled={!canManage || isCreating} id="document-file" name="file" type="file" />
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
        <Card>
          <CardHeader>
            <CardTitle>Search and filter</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="document-query">Search</Label>
              <Input
                id="document-query"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title, issuer, project, company, or filename"
                value={query}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-type-filter">Type</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="document-type-filter"
                onChange={(event) => setTypeFilter(event.target.value)}
                value={typeFilter}
              >
                <option value="ALL">All</option>
                {documentTypes.map((documentType) => (
                  <option key={documentType} value={documentType}>
                    {getDocumentTypeLabel(documentType)}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {filteredDocuments.map((document) => (
          <DocumentCard key={document.id} canManage={canManage} document={document} />
        ))}
        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              No company documents matched the current filters.
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
  const [isOpening, setIsOpening] = useState(false);

  async function addVersion(formData: FormData) {
    if (!canManage) {
      return;
    }

    setMessage(null);
    setIsSavingVersion(true);

    const response = await fetch(`/api/company/documents/${document.id}/versions`, {
      method: "POST",
      body: formData
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

  async function openLatestVersion(versionId?: string) {
    setMessage(null);
    setIsOpening(true);

    const response = await fetch(
      `/api/company/documents/${document.id}/download${versionId ? `?versionId=${versionId}` : ""}`
    );

    setIsOpening(false);

    const payload = (await response.json().catch(() => null)) as { message?: string; url?: string } | null;

    if (!response.ok || !payload?.url) {
      setMessage(payload?.message ?? "Unable to open document.");
      return;
    }

    window.open(payload.url, "_blank", "noopener,noreferrer");
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
          <Badge variant="secondary">{getDocumentTypeLabel(document.type)}</Badge>
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
              <TableHead>Size</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {document.versions.map((version) => (
              <TableRow key={version.id}>
                <TableCell>v{version.version}</TableCell>
                <TableCell>{version.originalName}</TableCell>
                <TableCell>{version.sizeBytes ? `${Math.round(version.sizeBytes / 1024)} KB` : "—"}</TableCell>
                <TableCell className="max-w-[280px] truncate">{version.storagePath}</TableCell>
                <TableCell>{new Date(version.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button onClick={() => void openLatestVersion(version.id)} size="sm" type="button" variant="outline">
                    Open
                  </Button>
                </TableCell>
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
            <Label>New file version</Label>
            <Input disabled={!canManage || isSavingVersion} name="file" type="file" />
          </div>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button disabled={!canManage || isSavingVersion} size="sm" type="submit">
              {isSavingVersion ? "Saving..." : "Add new version"}
            </Button>
            <Button disabled={isOpening} onClick={() => void openLatestVersion()} size="sm" type="button" variant="outline">
              {isOpening ? "Opening..." : "Open latest"}
            </Button>
          </div>
        </form>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

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
    return documents.filter((document: any) => {
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
      setError(payload?.message ?? "Não foi possível criar o documento.");
      return;
    }

    const form = document.getElementById("create-company-document-form") as HTMLFormElement | null;
    form?.reset();
    router.refresh();
  }

    let resolvedValue0: any;
  if (isCreating) {
    resolvedValue0 = "Criando...";
  } else {
    resolvedValue0 = "Criar documento";
  }
  let resolvedValue1: any;
  if (error) {
    resolvedValue1 = <p className="mt-3 text-sm text-destructive">{error}</p>;
  } else {
    resolvedValue1 = null;
  }
  let resolvedValue2: any;
  if (filteredDocuments.length === 0) {
    resolvedValue2 = (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              Nenhum documento da empresa corresponde aos filtros atuais.
            </CardContent>
          </Card>
        );
  } else {
    resolvedValue2 = null;
  }
return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Registro de documentos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-4">
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Documentos</p>
            <p className="mt-1 text-2xl font-semibold">{documents.length}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Vencendo em breve</p>
            <p className="mt-1 text-2xl font-semibold">
              {
                documents.filter((document: any) => {
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
            <p className="text-muted-foreground">Vinculados a projeto</p>
            <p className="mt-1 text-2xl font-semibold">{documents.filter((document: any) => document.project).length}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Documentos versionados</p>
            <p className="mt-1 text-2xl font-semibold">{documents.filter((document: any) => document.versions.length > 1).length}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Criar documento</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            id="create-company-document-form"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            onSubmit={(event: any) => {
              event.preventDefault();
              void createDocument(new FormData(event.currentTarget));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="document-title">Título</Label>
              <Input disabled={!canManage || isCreating} id="document-title" name="title" placeholder="Certificado de registro empresarial" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-type">Tipo</Label>
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
              <Label htmlFor="document-entity">Entidade legal</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canManage || isCreating}
                id="document-entity"
                name="legalEntityId"
              >
                <option value="">Nenhuma</option>
                {legalEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-project">Projeto</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canManage || isCreating}
                id="document-project"
                name="projectId"
              >
                <option value="">Nenhum</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-issuer">Emissor</Label>
              <Input disabled={!canManage || isCreating} id="document-issuer" name="issuer" placeholder="Registro governamental ou autoridade emissora" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-number">Número do documento</Label>
              <Input disabled={!canManage || isCreating} id="document-number" name="documentNumber" placeholder="Referência opcional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-expiration">Expira em</Label>
              <Input disabled={!canManage || isCreating} id="document-expiration" name="expiresAt" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-file">Arquivo</Label>
              <Input disabled={!canManage || isCreating} id="document-file" name="file" type="file" />
            </div>
            <div className="flex items-end">
              <Button disabled={!canManage || isCreating} type="submit">
                {resolvedValue0}
              </Button>
            </div>
          </form>
          {resolvedValue1}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Pesquisar e filtrar</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="document-query">Pesquisar</Label>
              <Input
                id="document-query"
                onChange={(event: any) => setQuery(event.target.value)}
                placeholder="Pesquisar por título, emissor, projeto, empresa ou nome de arquivo"
                value={query}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-type-filter">Tipo</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="document-type-filter"
                onChange={(event: any) => setTypeFilter(event.target.value)}
                value={typeFilter}
              >
                <option value="ALL">Todos</option>
                {documentTypes.map((documentType) => (
                  <option key={documentType} value={documentType}>
                    {getDocumentTypeLabel(documentType)}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {filteredDocuments.map((document: any) => (
          <DocumentCard key={document.id} canManage={canManage} document={document} />
        ))}
        {resolvedValue2}
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
      setMessage(payload?.message ?? "Não foi possível adicionar a versão do documento.");
      return;
    }

    setMessage("Versão do documento adicionada.");
    router.refresh();
  }

  async function openLatestVersion(versionId?: string) {
    setMessage(null);
    setIsOpening(true);

        let resolvedValue3: any;
    if (versionId) {
      resolvedValue3 = `?versionId=${versionId}`;
    } else {
      resolvedValue3 = "";
    }
const response = await fetch(
      `/api/company/documents/${document.id}/download${resolvedValue3}`
    );

    setIsOpening(false);

    const payload = (await response.json().catch(() => null)) as { message?: string; url?: string } | null;

    if (!response.ok || !payload?.url) {
      setMessage(payload?.message ?? "Não foi possível abrir o documento.");
      return;
    }

    window.open(payload.url, "_blank", "noopener,noreferrer");
  }

  const latestVersion = document.versions[0];

    let resolvedValue4: any;
  if (document.status === "ACTIVE") {
    resolvedValue4 = "default";
  } else {
    resolvedValue4 = "secondary";
  }
  let resolvedValue5: any;
  if (document.expiresAt) {
    resolvedValue5 = new Date(document.expiresAt).toLocaleDateString();
  } else {
    resolvedValue5 = "—";
  }
  let resolvedValue7: any;
  if (isSavingVersion) {
    resolvedValue7 = "Salvando...";
  } else {
    resolvedValue7 = "Adicionar nova versão";
  }
  let resolvedValue8: any;
  if (isOpening) {
    resolvedValue8 = "Abrindo...";
  } else {
    resolvedValue8 = "Abrir última";
  }
  let resolvedValue9: any;
  if (message) {
    resolvedValue9 = <p className="text-sm text-muted-foreground">{message}</p>;
  } else {
    resolvedValue9 = null;
  }
return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>{document.title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {document.legalEntity?.name || "Sem vínculo com empresa"} · {document.project?.name || "Sem vínculo com projeto"}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{getDocumentTypeLabel(document.type)}</Badge>
          <Badge variant={resolvedValue4}>{document.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm md:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Emissor</p>
            <p>{document.issuer || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Número do documento</p>
            <p>{document.documentNumber || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Expira</p>
            <p>{resolvedValue5}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Última versão</p>
            <p>v{latestVersion?.version ?? 1}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Versão</TableHead>
              <TableHead>Arquivo</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Caminho</TableHead>
              <TableHead>Criado</TableHead>
              <TableHead>Abrir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {document.versions.map((version: any) => {
              let resolvedValue6: any;
              if (version.sizeBytes) {
                resolvedValue6 = `${Math.round(version.sizeBytes / 1024)} KB`;
              } else {
                resolvedValue6 = "—";
              }
              return (
              <TableRow key={version.id}>
                <TableCell>v{version.version}</TableCell>
                <TableCell>{version.originalName}</TableCell>
                <TableCell>{resolvedValue6}</TableCell>
                <TableCell className="max-w-[280px] truncate">{version.storagePath}</TableCell>
                <TableCell>{new Date(version.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button onClick={() => void openLatestVersion(version.id)} size="sm" type="button" variant="outline">
                    Abrir
                  </Button>
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>

        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={(event: any) => {
            event.preventDefault();
            void addVersion(new FormData(event.currentTarget));
          }}
        >
          <div className="space-y-2">
            <Label>Nova versão do arquivo</Label>
            <Input disabled={!canManage || isSavingVersion} name="file" type="file" />
          </div>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button disabled={!canManage || isSavingVersion} size="sm" type="submit">
              {resolvedValue7}
            </Button>
            <Button disabled={isOpening} onClick={() => void openLatestVersion()} size="sm" type="button" variant="outline">
              {resolvedValue8}
            </Button>
          </div>
        </form>
        {resolvedValue9}
      </CardContent>
    </Card>
  );
}

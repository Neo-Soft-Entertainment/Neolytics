"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type {
  CompanyComplianceRecord,
  CompanyDocumentRecord,
  CompanyLegalEntityRecord,
  CompanyMemberOption,
  CompanyProjectOption
} from "@/components/company/company-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const complianceTypes = [
  "TAX",
  "LEGAL",
  "CORPORATE",
  "LABOR",
  "ACCOUNTING",
  "CERTIFICATE",
  "OTHER"
] as const;

const complianceStatuses = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "WAIVED",
  "OVERDUE"
] as const;

export function CompanyCompliancePanel({
  complianceItems,
  legalEntities,
  documents,
  members,
  projects,
  canManage
}: {
  complianceItems: CompanyComplianceRecord[];
  legalEntities: CompanyLegalEntityRecord[];
  documents: CompanyDocumentRecord[];
  members: CompanyMemberOption[];
  projects: CompanyProjectOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filteredItems = useMemo(() => {
    return complianceItems.filter((item: any) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }

      if (typeFilter !== "ALL" && item.type !== typeFilter) {
        return false;
      }

      if (!query.trim()) {
        return true;
      }

      const haystack = [
        item.title,
        item.type,
        item.status,
        item.legalEntity?.name,
        item.project?.name,
        item.ownerUser?.name,
        item.ownerUser?.email,
        item.sourceDocument?.title,
        item.notes
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query.trim().toLowerCase());
    });
  }, [complianceItems, query, statusFilter, typeFilter]);

  async function createItem(formData: FormData) {
    if (!canManage) {
      return;
    }

    setError(null);
    setIsCreating(true);

    const response = await fetch("/api/company/compliance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: formData.get("title"),
        type: formData.get("type"),
        legalEntityId: formData.get("legalEntityId") || undefined,
        projectId: formData.get("projectId") || undefined,
        ownerUserId: formData.get("ownerUserId") || undefined,
        sourceDocumentId: formData.get("sourceDocumentId") || undefined,
        dueAt: formData.get("dueAt") || undefined,
        notes: formData.get("notes")
      })
    });

    setIsCreating(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? "Não foi possível criar o item de conformidade.");
      return;
    }

    const form = document.getElementById("create-compliance-item-form") as HTMLFormElement | null;
    form?.reset();
    router.refresh();
  }

    let resolvedValue0: any;
  if (isCreating) {
    resolvedValue0 = "Criando...";
  } else {
    resolvedValue0 = "Criar item de conformidade";
  }
  let resolvedValue1: any;
  if (error) {
    resolvedValue1 = <p className="mt-3 text-sm text-destructive">{error}</p>;
  } else {
    resolvedValue1 = null;
  }
  let resolvedValue2: any;
  if (filteredItems.length === 0) {
    resolvedValue2 = (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={6}>
                    Nenhum item de conformidade corresponde aos filtros atuais.
                  </TableCell>
                </TableRow>
              );
  } else {
    resolvedValue2 = null;
  }
return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Central de controle de conformidade</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-4">
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Itens totais</p>
            <p className="mt-1 text-2xl font-semibold">{complianceItems.length}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Itens abertos</p>
            <p className="mt-1 text-2xl font-semibold">
              {complianceItems.filter((item: any) => item.status === "PENDING" || item.status === "IN_PROGRESS").length}
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Vencidos</p>
            <p className="mt-1 text-2xl font-semibold">
              {
                complianceItems.filter((item: any) => {
                  if (!item.dueAt) {
                    return false;
                  }

                  return new Date(item.dueAt) < new Date() && item.status !== "COMPLETED" && item.status !== "WAIVED";
                }).length
              }
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Concluídos</p>
            <p className="mt-1 text-2xl font-semibold">
              {complianceItems.filter((item: any) => item.status === "COMPLETED").length}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Criar item de conformidade</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            id="create-compliance-item-form"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            onSubmit={(event: any) => {
              event.preventDefault();
              void createItem(new FormData(event.currentTarget));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="compliance-title">Título</Label>
              <Input disabled={!canManage || isCreating} id="compliance-title" name="title" placeholder="Renovar certificado fiscal" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compliance-type">Tipo</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canManage || isCreating}
                id="compliance-type"
                name="type"
              >
                {complianceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="compliance-due-date">Vencimento</Label>
              <Input disabled={!canManage || isCreating} id="compliance-due-date" name="dueAt" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compliance-entity">Entidade legal</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canManage || isCreating}
                id="compliance-entity"
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
              <Label htmlFor="compliance-project">Projeto</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canManage || isCreating}
                id="compliance-project"
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
              <Label htmlFor="compliance-owner">Responsável</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canManage || isCreating}
                id="compliance-owner"
                name="ownerUserId"
              >
                <option value="">Sem responsável</option>
                {members.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.name || member.user.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="compliance-source-document">Documento de origem</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canManage || isCreating}
                id="compliance-source-document"
                name="sourceDocumentId"
              >
                <option value="">Nenhum</option>
                {documents.map((document: any) => (
                  <option key={document.id} value={document.id}>
                    {document.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2 xl:col-span-3">
              <Label htmlFor="compliance-notes">Observações</Label>
              <Textarea disabled={!canManage || isCreating} id="compliance-notes" name="notes" placeholder="O que precisa ser entregue ou conferido?" />
            </div>
            <div className="md:col-span-2 xl:col-span-3">
              <Button disabled={!canManage || isCreating} type="submit">
                {resolvedValue0}
              </Button>
            </div>
          </form>
          {resolvedValue1}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backlog de conformidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="compliance-query">Pesquisar</Label>
              <Input
                id="compliance-query"
                onChange={(event: any) => setQuery(event.target.value)}
                placeholder="Pesquisar por título, responsável, entidade, projeto ou observações"
                value={query}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compliance-status-filter">Status</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="compliance-status-filter"
                onChange={(event: any) => setStatusFilter(event.target.value)}
                value={statusFilter}
              >
                <option value="ALL">Todos</option>
                {complianceStatuses.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="compliance-type-filter">Tipo</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="compliance-type-filter"
                onChange={(event: any) => setTypeFilter(event.target.value)}
                value={typeFilter}
              >
                <option value="ALL">Todos</option>
                {complianceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item: any) => (
                <ComplianceRow key={item.id} canManage={canManage} item={item} />
              ))}
              {resolvedValue2}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ComplianceRow({
  item,
  canManage
}: {
  item: CompanyComplianceRecord;
  canManage: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(item.status);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function saveStatus() {
    if (!canManage) {
      return;
    }

    setMessage(null);
    setIsSaving(true);

    const response = await fetch(`/api/company/compliance/${item.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status
      })
    });

    setIsSaving(false);

    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setMessage(payload?.message ?? "Não foi possível atualizar o item de conformidade.");
      return;
    }

    setMessage("Salvo.");
    router.refresh();
  }

    let resolvedValue3: any;
  if (item.sourceDocument) {
    resolvedValue3 = ` · ${item.sourceDocument.title}`;
  } else {
    resolvedValue3 = "";
  }
  let resolvedValue4: any;
  if (message) {
    resolvedValue4 = <p className="mt-1 text-xs text-muted-foreground">{message}</p>;
  } else {
    resolvedValue4 = null;
  }
  let resolvedValue5: any;
  if (item.dueAt) {
    resolvedValue5 = new Date(item.dueAt).toLocaleDateString();
  } else {
    resolvedValue5 = "—";
  }
  let resolvedValue6: any;
  if (isSaving) {
    resolvedValue6 = "...";
  } else {
    resolvedValue6 = "Salvar";
  }
return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium">{item.title}</p>
          <p className="text-xs text-muted-foreground">
            {item.legalEntity?.name || item.project?.name || "Org-level"}{resolvedValue3}
          </p>
          {resolvedValue4}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{item.type}</Badge>
      </TableCell>
      <TableCell>{item.project?.name || item.legalEntity?.name || "Organização"}</TableCell>
      <TableCell>{item.ownerUser?.name || item.ownerUser?.email || "Unassigned"}</TableCell>
      <TableCell>{resolvedValue5}</TableCell>
      <TableCell>
        <div className="flex min-w-[190px] items-center gap-2">
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={!canManage || isSaving}
            onChange={(event: any) => setStatus(event.target.value as typeof status)}
            value={status}
          >
            {complianceStatuses.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption}
              </option>
            ))}
          </select>
          <Button disabled={!canManage || isSaving} onClick={saveStatus} size="sm" type="button">
            {resolvedValue6}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

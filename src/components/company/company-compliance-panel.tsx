"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      setError(payload?.message ?? "Unable to create compliance item.");
      return;
    }

    const form = document.getElementById("create-compliance-item-form") as HTMLFormElement | null;
    form?.reset();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Compliance control center</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-4">
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Total items</p>
            <p className="mt-1 text-2xl font-semibold">{complianceItems.length}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Open items</p>
            <p className="mt-1 text-2xl font-semibold">
              {complianceItems.filter((item) => item.status === "PENDING" || item.status === "IN_PROGRESS").length}
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Overdue</p>
            <p className="mt-1 text-2xl font-semibold">
              {
                complianceItems.filter((item) => {
                  if (!item.dueAt) {
                    return false;
                  }

                  return new Date(item.dueAt) < new Date() && item.status !== "COMPLETED" && item.status !== "WAIVED";
                }).length
              }
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">Completed</p>
            <p className="mt-1 text-2xl font-semibold">
              {complianceItems.filter((item) => item.status === "COMPLETED").length}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create compliance item</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            id="create-compliance-item-form"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              void createItem(new FormData(event.currentTarget));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="compliance-title">Title</Label>
              <Input disabled={!canManage || isCreating} id="compliance-title" name="title" placeholder="Renew tax certificate" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compliance-type">Type</Label>
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
              <Label htmlFor="compliance-due-date">Due date</Label>
              <Input disabled={!canManage || isCreating} id="compliance-due-date" name="dueAt" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compliance-entity">Legal entity</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canManage || isCreating}
                id="compliance-entity"
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
              <Label htmlFor="compliance-project">Project</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canManage || isCreating}
                id="compliance-project"
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
              <Label htmlFor="compliance-owner">Owner</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canManage || isCreating}
                id="compliance-owner"
                name="ownerUserId"
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.name || member.user.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="compliance-source-document">Source document</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canManage || isCreating}
                id="compliance-source-document"
                name="sourceDocumentId"
              >
                <option value="">None</option>
                {documents.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2 xl:col-span-3">
              <Label htmlFor="compliance-notes">Notes</Label>
              <Textarea disabled={!canManage || isCreating} id="compliance-notes" name="notes" placeholder="What needs to be delivered or checked?" />
            </div>
            <div className="md:col-span-2 xl:col-span-3">
              <Button disabled={!canManage || isCreating} type="submit">
                {isCreating ? "Creating..." : "Create compliance item"}
              </Button>
            </div>
          </form>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compliance backlog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {complianceItems.map((item) => (
                <ComplianceRow key={item.id} canManage={canManage} item={item} />
              ))}
              {complianceItems.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={6}>
                    No compliance items registered yet.
                  </TableCell>
                </TableRow>
              ) : null}
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
      setMessage(payload?.message ?? "Unable to update compliance item.");
      return;
    }

    setMessage("Saved.");
    router.refresh();
  }

  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium">{item.title}</p>
          <p className="text-xs text-muted-foreground">
            {item.legalEntity?.name || item.project?.name || "Org-level"}{item.sourceDocument ? ` · ${item.sourceDocument.title}` : ""}
          </p>
          {message ? <p className="mt-1 text-xs text-muted-foreground">{message}</p> : null}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{item.type}</Badge>
      </TableCell>
      <TableCell>{item.project?.name || item.legalEntity?.name || "Organization"}</TableCell>
      <TableCell>{item.ownerUser?.name || item.ownerUser?.email || "Unassigned"}</TableCell>
      <TableCell>{item.dueAt ? new Date(item.dueAt).toLocaleDateString() : "—"}</TableCell>
      <TableCell>
        <div className="flex min-w-[190px] items-center gap-2">
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={!canManage || isSaving}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            value={status}
          >
            {complianceStatuses.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption}
              </option>
            ))}
          </select>
          <Button disabled={!canManage || isSaving} onClick={saveStatus} size="sm" type="button">
            {isSaving ? "..." : "Save"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

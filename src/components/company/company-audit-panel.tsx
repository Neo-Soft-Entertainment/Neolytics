"use client";

import { useMemo, useState } from "react";

import type { CompanyAuditRecord } from "@/components/company/company-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function CompanyAuditPanel({
  auditEvents
}: {
  auditEvents: CompanyAuditRecord[];
}) {
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState("ALL");

  const entityTypes = useMemo(() => {
    return ["ALL", ...Array.from(new Set(auditEvents.map((event) => event.entityType))).sort()];
  }, [auditEvents]);

  const filteredEvents = auditEvents.filter((event) => {
    if (entityType !== "ALL" && event.entityType !== entityType) {
      return false;
    }

    if (!query.trim()) {
      return true;
    }

    const haystack = [
      event.action,
      event.entityType,
      event.entityId,
      event.user?.name,
      event.user?.email,
      JSON.stringify(event.metadata || {})
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Atividade de auditoria</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="audit-query">Pesquisar</Label>
            <Input
              id="audit-query"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar por ação, usuário, entidade ou metadados"
              value={query}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-entity-type">Tipo de entidade</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              id="audit-entity-type"
              onChange={(event) => setEntityType(event.target.value)}
              value={entityType}
            >
              {entityTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "ALL" ? "Todos" : type}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Metadados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{new Date(event.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{event.action}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{event.entityType}</p>
                      <p className="text-xs text-muted-foreground">{event.entityId}</p>
                    </div>
                  </TableCell>
                  <TableCell>{event.user?.name || event.user?.email || "Sistema"}</TableCell>
                  <TableCell className="max-w-[320px]">
                    <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                      {event.metadata ? JSON.stringify(event.metadata, null, 2) : "—"}
                    </pre>
                  </TableCell>
                </TableRow>
              ))}
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={5}>
                    Nenhum evento de auditoria corresponde aos filtros atuais.
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

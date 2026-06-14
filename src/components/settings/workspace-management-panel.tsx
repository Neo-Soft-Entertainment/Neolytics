"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WorkspaceManagementPanel({
  canManage,
  currentWorkspaceId,
  workspaces
}: {
  canManage: boolean;
  currentWorkspaceId: string | null;
  workspaces: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
  }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  async function setActiveWorkspace(workspaceId: string, workspaceName: string) {
    if (workspaceId === currentWorkspaceId) {
      return;
    }

    setMessage(null);
    setError(null);
    setSwitchingId(workspaceId);

    const response = await fetch("/api/workspaces/current", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ workspaceId })
    });

    setSwitchingId(null);

    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setError(payload?.message ?? "Não foi possível trocar a área de trabalho.");
      return;
    }

    setMessage(`Área de trabalho "${workspaceName}" agora está ativa.`);
    router.refresh();
  }

  async function deleteWorkspace(workspaceId: string, workspaceName: string) {
    if (!canManage) {
      return;
    }

    const confirmed = window.confirm(
      `Excluir a área de trabalho "${workspaceName}" permanentemente? Isso remove jogos salvos, projetos, conjuntos de concorrentes e relatórios.`
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);
    setError(null);
    setDeletingId(workspaceId);

    const response = await fetch(`/api/workspaces?workspaceId=${workspaceId}`, {
      method: "DELETE"
    });

    setDeletingId(null);

    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setError(payload?.message ?? "Não foi possível excluir a área de trabalho.");
      return;
    }

    setMessage(`Área de trabalho "${workspaceName}" excluída.`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de áreas de trabalho ({workspaces.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {workspaces.map((workspace) => (
          <div key={workspace.id} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{workspace.name}</p>
                  {workspace.id === currentWorkspaceId ? <Badge>Atual</Badge> : null}
                </div>
                <p className="mt-1 text-muted-foreground">Slug: {workspace.slug}</p>
                <p className="mt-1 text-muted-foreground">
                  {workspace.description || "Sem descrição ainda."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={workspace.id === currentWorkspaceId || switchingId === workspace.id}
                  onClick={() => {
                    void setActiveWorkspace(workspace.id, workspace.name);
                  }}
                  size="sm"
                  type="button"
                  variant={workspace.id === currentWorkspaceId ? "secondary" : "outline"}
                >
                  {workspace.id === currentWorkspaceId ? "Ativo" : switchingId === workspace.id ? "Trocando..." : "Definir ativo"}
                </Button>
                <Button
                  disabled={!canManage || workspaces.length <= 1 || deletingId === workspace.id}
                  onClick={() => deleteWorkspace(workspace.id, workspace.name)}
                  size="sm"
                  type="button"
                  variant="destructive"
                >
                  {deletingId === workspace.id ? "Excluindo..." : "Excluir"}
                </Button>
              </div>
            </div>
          </div>
        ))}
        {!canManage ? (
          <p className="text-muted-foreground">Apenas administradores da organização podem gerenciar áreas de trabalho.</p>
        ) : null}
        {workspaces.length <= 1 ? (
          <p className="text-muted-foreground">Pelo menos uma área de trabalho deve permanecer na organização.</p>
        ) : null}
        {message ? <p className="text-emerald-600">{message}</p> : null}
        {error ? <p className="text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

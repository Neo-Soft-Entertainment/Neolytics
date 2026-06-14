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

    let resolvedValue4: any;
  if (!canManage) {
    resolvedValue4 = (
          <p className="text-muted-foreground">Apenas administradores da organização podem gerenciar áreas de trabalho.</p>
        );
  } else {
    resolvedValue4 = null;
  }
  let resolvedValue5: any;
  if (workspaces.length <= 1) {
    resolvedValue5 = (
          <p className="text-muted-foreground">Pelo menos uma área de trabalho deve permanecer na organização.</p>
        );
  } else {
    resolvedValue5 = null;
  }
  let resolvedValue6: any;
  if (message) {
    resolvedValue6 = <p className="text-emerald-600">{message}</p>;
  } else {
    resolvedValue6 = null;
  }
  let resolvedValue7: any;
  if (error) {
    resolvedValue7 = <p className="text-destructive">{error}</p>;
  } else {
    resolvedValue7 = null;
  }
return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de áreas de trabalho ({workspaces.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {workspaces.map((workspace) => {
          let resolvedValue0: any;
          if (workspace.id === currentWorkspaceId) {
            resolvedValue0 = <Badge>Atual</Badge>;
          } else {
            resolvedValue0 = null;
          }
          let resolvedValue1: any;
          if (workspace.id === currentWorkspaceId) {
            resolvedValue1 = "secondary";
          } else {
            resolvedValue1 = "outline";
          }
          let resolvedValue2: any;
          if (workspace.id === currentWorkspaceId) {
            resolvedValue2 = "Ativo";
          } else {
                        let resolvedValue8: any;
            if (switchingId === workspace.id) {
              resolvedValue8 = "Trocando...";
            } else {
              resolvedValue8 = "Definir ativo";
            }
resolvedValue2 = resolvedValue8;
          }
          let resolvedValue3: any;
          if (deletingId === workspace.id) {
            resolvedValue3 = "Excluindo...";
          } else {
            resolvedValue3 = "Excluir";
          }
          return (
          <div key={workspace.id} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{workspace.name}</p>
                  {resolvedValue0}
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
                  variant={resolvedValue1}
                >
                  {resolvedValue2}
                </Button>
                <Button
                  disabled={!canManage || workspaces.length <= 1 || deletingId === workspace.id}
                  onClick={() => deleteWorkspace(workspace.id, workspace.name)}
                  size="sm"
                  type="button"
                  variant="destructive"
                >
                  {resolvedValue3}
                </Button>
              </div>
            </div>
          </div>
        );
        })}
        {resolvedValue4}
        {resolvedValue5}
        {resolvedValue6}
        {resolvedValue7}
      </CardContent>
    </Card>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WorkspaceManagementPanel({
  canManage,
  workspaces
}: {
  canManage: boolean;
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

  async function deleteWorkspace(workspaceId: string, workspaceName: string) {
    if (!canManage) {
      return;
    }

    const confirmed = window.confirm(
      `Delete workspace "${workspaceName}" permanently? This removes its saved games, projects, competitor sets, and reports.`
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
      setError(payload?.message ?? "Unable to delete workspace.");
      return;
    }

    setMessage(`Workspace "${workspaceName}" deleted.`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace list ({workspaces.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {workspaces.map((workspace) => (
          <div key={workspace.id} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-medium">{workspace.name}</p>
                <p className="mt-1 text-muted-foreground">Slug: {workspace.slug}</p>
                <p className="mt-1 text-muted-foreground">
                  {workspace.description || "No description yet."}
                </p>
              </div>
              <Button
                disabled={!canManage || workspaces.length <= 1 || deletingId === workspace.id}
                onClick={() => deleteWorkspace(workspace.id, workspace.name)}
                size="sm"
                type="button"
                variant="destructive"
              >
                {deletingId === workspace.id ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        ))}
        {!canManage ? (
          <p className="text-muted-foreground">Only organization admins can manage workspaces.</p>
        ) : null}
        {workspaces.length <= 1 ? (
          <p className="text-muted-foreground">At least one workspace must remain in the organization.</p>
        ) : null}
        {message ? <p className="text-emerald-600">{message}</p> : null}
        {error ? <p className="text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

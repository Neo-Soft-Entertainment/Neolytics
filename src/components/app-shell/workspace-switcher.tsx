"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type WorkspaceOption = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
};

export function WorkspaceSwitcher({
  currentWorkspaceId,
  workspaces,
  fallbackWorkspaceName
}: {
  currentWorkspaceId?: string | null;
  workspaces: WorkspaceOption[];
  fallbackWorkspaceName?: string | null;
}) {
  const router = useRouter();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(currentWorkspaceId ?? workspaces[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedWorkspaceId(currentWorkspaceId ?? workspaces[0]?.id ?? "");
  }, [currentWorkspaceId, workspaces]);

  const currentWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId);
  const activeWorkspaceName = currentWorkspace?.name ?? fallbackWorkspaceName ?? "Workspace";

  async function onWorkspaceSelect(workspaceId: string) {
    if (workspaceId === selectedWorkspaceId) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/workspaces/current", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ workspaceId })
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? "Unable to switch workspace.");
      return;
    }

    setSelectedWorkspaceId(workspaceId);
    router.refresh();
  }

  if (workspaces.length <= 1) {
    return (
      <div className="min-w-0 space-y-1.5">
        <div className="flex min-h-11 items-center rounded-2xl border border-white/10 bg-white/35 px-3 text-sm font-medium dark:bg-white/[0.04]">
          <span className="truncate">{activeWorkspaceName}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">Current workspace</p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="h-auto w-full items-start justify-between rounded-2xl border-white/10 bg-transparent px-3 py-2 text-left shadow-none hover:bg-white/5"
            disabled={isSubmitting}
            variant="outline"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{activeWorkspaceName}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {isSubmitting ? "Switching workspace..." : "Current workspace"}
              </p>
            </div>
            <ChevronsUpDown className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[320px] border-white/10 bg-background/95 p-2 backdrop-blur-xl">
          <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((workspace) => {
            const isCurrent = workspace.id === selectedWorkspaceId;

            return (
              <DropdownMenuItem
                key={workspace.id}
                className="flex items-start justify-between gap-3 rounded-xl px-3 py-3"
                disabled={isCurrent || isSubmitting}
                onSelect={(event) => {
                  event.preventDefault();
                  void onWorkspaceSelect(workspace.id);
                }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{workspace.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {workspace.description?.trim() || workspace.slug}
                  </p>
                </div>
                {isCurrent ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <p className="truncate text-xs text-muted-foreground">Current workspace</p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
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
  const t = useI18n();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(currentWorkspaceId ?? workspaces[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedWorkspaceId(currentWorkspaceId ?? workspaces[0]?.id ?? "");
  }, [currentWorkspaceId, workspaces]);

  const currentWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId);
  const activeWorkspaceName = currentWorkspace?.name ?? fallbackWorkspaceName ?? t("shell.workspace");

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
      setError(payload?.message ?? t("shell.workspaceSwitchError"));
      return;
    }

    setSelectedWorkspaceId(workspaceId);
    router.refresh();
  }

  if (workspaces.length <= 1) {
    return (
      <div className="min-w-0 space-y-1.5">
        <div className="flex min-h-11 items-center rounded-xl border border-white/10 bg-white/35 px-3 text-sm font-medium dark:bg-white/[0.04]">
          <span className="truncate">{activeWorkspaceName}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{t("shell.currentWorkspace")}</p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex min-h-11 w-full items-center justify-between rounded-xl border border-white/10 bg-white/35 px-3 py-2 text-left transition-colors hover:bg-white/45 disabled:pointer-events-none disabled:opacity-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
            disabled={isSubmitting}
            type="button"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{activeWorkspaceName}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {isSubmitting ? t("shell.switchingWorkspace") : t("shell.currentWorkspace")}
              </p>
            </div>
            <ChevronsUpDown className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="mt-2 w-[320px] rounded-2xl border-white/10 bg-background/95 p-2 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl" sideOffset={10}>
          <DropdownMenuLabel>{t("shell.switchWorkspace")}</DropdownMenuLabel>
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
                {isCurrent ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <p className="truncate text-xs text-muted-foreground">{t("shell.currentWorkspace")}</p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

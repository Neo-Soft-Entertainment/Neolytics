"use client";

import type { OrganizationRole, SubscriptionPlan } from "@prisma/client";
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
import { getSubscriptionPlanLabel } from "@/lib/subscription-plans";

type OrganizationOption = {
  id: string;
  name: string;
  role: OrganizationRole;
  subscriptionPlan: SubscriptionPlan;
};

export function OrganizationSwitcher({
  currentOrganizationId,
  organizations,
  fallbackOrganizationName
}: {
  currentOrganizationId: string;
  organizations: OrganizationOption[];
  fallbackOrganizationName?: string;
}) {
  const router = useRouter();
  const t = useI18n();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(currentOrganizationId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedOrganizationId(currentOrganizationId);
  }, [currentOrganizationId]);

  const currentOrganization = organizations.find((organization) => organization.id === selectedOrganizationId);
  const activeOrganizationName = currentOrganization?.name ?? fallbackOrganizationName ?? t("shell.organization");
  const activeRoleLabel = currentOrganization ? `${currentOrganization.role} access` : t("shell.activeOrganization");

  async function onOrganizationSelect(organizationId: string) {
    if (organizationId === selectedOrganizationId) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/organizations/current", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ organizationId })
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? t("shell.organizationSwitchError"));
      return;
    }

    setSelectedOrganizationId(organizationId);
    router.refresh();
  }

  if (organizations.length <= 1) {
    return (
      <div className="min-w-0 space-y-1.5">
        <div className="flex min-h-11 items-center rounded-xl border border-white/10 bg-white/35 px-3 text-sm font-medium dark:bg-white/[0.04]">
          <span className="truncate">{activeOrganizationName}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{activeRoleLabel}</p>
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
              <p className="truncate text-sm font-medium">{activeOrganizationName}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {isSubmitting ? t("shell.switchingOrganization") : activeRoleLabel}
              </p>
            </div>
            <ChevronsUpDown className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="mt-2 w-[320px] rounded-2xl border-white/10 bg-background/95 p-2 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl" sideOffset={10}>
          <DropdownMenuLabel>{t("shell.switchOrganization")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizations.map((organization) => {
            const isCurrent = organization.id === selectedOrganizationId;

            return (
              <DropdownMenuItem
                key={organization.id}
                className="flex items-start justify-between gap-3 rounded-xl px-3 py-3"
                disabled={isCurrent || isSubmitting}
                onSelect={(event) => {
                  event.preventDefault();
                  void onOrganizationSelect(organization.id);
                }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{organization.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {organization.role} · {getSubscriptionPlanLabel(organization.subscriptionPlan)}
                  </p>
                </div>
                {isCurrent ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <p className="truncate text-xs text-muted-foreground">{activeRoleLabel}</p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

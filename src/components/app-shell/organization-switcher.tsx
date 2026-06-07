"use client";

import { OrganizationRole, SubscriptionPlan } from "@prisma/client";
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
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(currentOrganizationId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedOrganizationId(currentOrganizationId);
  }, [currentOrganizationId]);

  const currentOrganization = organizations.find((organization) => organization.id === selectedOrganizationId);
  const activeOrganizationName = currentOrganization?.name ?? fallbackOrganizationName ?? "Organization";
  const activeRoleLabel = currentOrganization ? `${currentOrganization.role} access` : "Active organization";

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
      setError(payload?.message ?? "Unable to switch organization.");
      return;
    }

    setSelectedOrganizationId(organizationId);
    router.refresh();
  }

  if (organizations.length <= 1) {
    return (
      <div className="min-w-0 space-y-1.5">
        <div className="flex min-h-11 items-center rounded-2xl border border-white/10 bg-white/35 px-3 text-sm font-medium dark:bg-white/[0.04]">
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
          <Button
            className="h-auto w-full items-start justify-between rounded-2xl border-white/10 bg-transparent px-3 py-2 text-left shadow-none hover:bg-white/5"
            disabled={isSubmitting}
            variant="outline"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{activeOrganizationName}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {isSubmitting ? "Switching organization..." : activeRoleLabel}
              </p>
            </div>
            <ChevronsUpDown className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[320px] border-white/10 bg-background/95 p-2 backdrop-blur-xl">
          <DropdownMenuLabel>Switch organization</DropdownMenuLabel>
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

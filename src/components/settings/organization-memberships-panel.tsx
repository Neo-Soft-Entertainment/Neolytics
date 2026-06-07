"use client";

import { OrganizationRole, SubscriptionPlan } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSubscriptionPlanLabel } from "@/lib/subscription-plans";

export function OrganizationMembershipsPanel({
  currentOrganizationId,
  memberships
}: {
  currentOrganizationId: string;
  memberships: Array<{
    organizationId: string;
    role: OrganizationRole;
    organization: {
      id: string;
      name: string;
      subscriptionPlan: SubscriptionPlan;
      workspaces: Array<{ id: string }>;
    };
  }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  async function switchOrganization(organizationId: string) {
    if (organizationId === currentOrganizationId) {
      return;
    }

    setError(null);
    setSwitchingId(organizationId);

    const response = await fetch("/api/organizations/current", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ organizationId })
    });

    setSwitchingId(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? "Unable to switch organization.");
      return;
    }

    router.refresh();
  }

  return (
    <Card className="overflow-hidden">
      <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
      <CardHeader>
        <CardTitle>Your organizations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-3 lg:grid-cols-2">
          {memberships.map((membership) => {
            const isCurrent = membership.organizationId === currentOrganizationId;

            return (
              <div key={membership.organizationId} className="rounded-[1.5rem] border border-white/10 bg-white/45 p-4 backdrop-blur dark:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{membership.organization.name}</p>
                    <p className="mt-1 text-muted-foreground">
                      {membership.organization.workspaces.length} workspace(s)
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={isCurrent ? "default" : "secondary"}>
                      {isCurrent ? "Current" : membership.role}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getSubscriptionPlanLabel(membership.organization.subscriptionPlan)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {membership.role} access
                  </p>
                  <Button
                    disabled={isCurrent || switchingId === membership.organizationId}
                    size="sm"
                    type="button"
                    variant={isCurrent ? "secondary" : "outline"}
                    onClick={() => {
                      void switchOrganization(membership.organizationId);
                    }}
                  >
                    {isCurrent ? "Active" : switchingId === membership.organizationId ? "Switching..." : "Switch"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        {error ? <p className="text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

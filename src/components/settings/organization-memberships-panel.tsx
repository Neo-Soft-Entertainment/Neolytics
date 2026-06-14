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
      setError(payload?.message ?? "Não foi possível trocar a organização.");
      return;
    }

    router.refresh();
  }

    let resolvedValue4: any;
  if (error) {
    resolvedValue4 = <p className="text-destructive">{error}</p>;
  } else {
    resolvedValue4 = null;
  }
return (
    <Card className="overflow-hidden">
      <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
      <CardHeader>
        <CardTitle>Suas organizações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-3 lg:grid-cols-2">
          {memberships.map((membership: any) => {
            const isCurrent = membership.organizationId === currentOrganizationId;

                        let resolvedValue0: any;
            if (isCurrent) {
              resolvedValue0 = "default";
            } else {
              resolvedValue0 = "secondary";
            }
            let resolvedValue1: any;
            if (isCurrent) {
              resolvedValue1 = "Atual";
            } else {
              resolvedValue1 = membership.role;
            }
            let resolvedValue2: any;
            if (isCurrent) {
              resolvedValue2 = "secondary";
            } else {
              resolvedValue2 = "outline";
            }
            let resolvedValue3: any;
            if (isCurrent) {
              resolvedValue3 = "Ativa";
            } else {
                            let resolvedValue5: any;
              if (switchingId === membership.organizationId) {
                resolvedValue5 = "Trocando...";
              } else {
                resolvedValue5 = "Trocar";
              }
resolvedValue3 = resolvedValue5;
            }
return (
              <div key={membership.organizationId} className="rounded-[1.5rem] border border-white/10 bg-white/45 p-4 backdrop-blur dark:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{membership.organization.name}</p>
                    <p className="mt-1 text-muted-foreground">
                      {membership.organization.workspaces.length} área(s) de trabalho
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={resolvedValue0}>
                      {resolvedValue1}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getSubscriptionPlanLabel(membership.organization.subscriptionPlan)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Acesso {membership.role}
                  </p>
                  <Button
                    disabled={isCurrent || switchingId === membership.organizationId}
                    size="sm"
                    type="button"
                    variant={resolvedValue2}
                    onClick={() => {
                      void switchOrganization(membership.organizationId);
                    }}
                  >
                    {resolvedValue3}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        {resolvedValue4}
      </CardContent>
    </Card>
  );
}

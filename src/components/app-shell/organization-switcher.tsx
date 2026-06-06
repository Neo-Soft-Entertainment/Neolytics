"use client";

import { OrganizationRole, SubscriptionPlan } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OrganizationOption = {
  id: string;
  name: string;
  role: OrganizationRole;
  subscriptionPlan: SubscriptionPlan;
};

export function OrganizationSwitcher({
  currentOrganizationId,
  organizations
}: {
  currentOrganizationId: string;
  organizations: OrganizationOption[];
}) {
  const router = useRouter();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(currentOrganizationId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedOrganizationId(currentOrganizationId);
  }, [currentOrganizationId]);

  const currentOrganization = organizations.find((organization) => organization.id === selectedOrganizationId);

  async function onValueChange(organizationId: string) {
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

  return (
    <div className="min-w-[220px]">
      <Select disabled={isSubmitting} onValueChange={onValueChange} value={selectedOrganizationId}>
        <SelectTrigger className="h-9 rounded-full border-white/10 bg-transparent px-3 text-left shadow-none focus:ring-0">
          <SelectValue placeholder="Select organization" />
        </SelectTrigger>
        <SelectContent align="start" className="border-white/10 bg-background/90 backdrop-blur-xl">
          {organizations.map((organization) => (
            <SelectItem key={organization.id} value={organization.id}>
              {organization.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {currentOrganization ? `${currentOrganization.role} access` : "Organization access"}
      </p>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

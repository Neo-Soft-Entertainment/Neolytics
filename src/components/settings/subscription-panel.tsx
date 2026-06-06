"use client";

import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatSubscriptionLimit,
  subscriptionFeatureRows,
  subscriptionPlans
} from "@/lib/subscription-plans";

type SubscriptionSnapshot = {
  plan: SubscriptionPlan;
  planLabel: string;
  planDescription: string;
  status: SubscriptionStatus;
  periodKey: string;
  currentPeriodStart: Date | string | null;
  currentPeriodEnd: Date | string | null;
  usage: {
    seats: number;
    workspaces: number;
    savedGames: number;
    competitorSets: number;
    projects: number;
    reportsGenerated: number;
    exportsGenerated: number;
    projectAnalysesRun: number;
    gddsGenerated: number;
  };
  limits: {
    seats: number | null;
    workspaces: number | null;
    savedGames: number | null;
    competitorSets: number | null;
    projects: number | null;
    reportsGenerated: number | null;
    exportsGenerated: number | null;
    projectAnalysesRun: number | null;
    gddsGenerated: number | null;
  };
};

const usageRows: Array<{
  key: keyof SubscriptionSnapshot["usage"];
  label: string;
}> = [
  { key: "seats", label: "Seats" },
  { key: "workspaces", label: "Workspaces" },
  { key: "savedGames", label: "Saved games" },
  { key: "competitorSets", label: "Competitor sets" },
  { key: "projects", label: "Active projects" },
  { key: "reportsGenerated", label: "Reports this month" },
  { key: "exportsGenerated", label: "Exports this month" },
  { key: "projectAnalysesRun", label: "Analyses this month" },
  { key: "gddsGenerated", label: "GDDs this month" }
];

export function SubscriptionPanel({
  snapshot,
  canManage
}: {
  snapshot: SubscriptionSnapshot;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<SubscriptionPlan | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function changePlan(plan: SubscriptionPlan) {
    setMessage(null);
    setIsSubmitting(plan);

    const response = await fetch("/api/organizations/subscription", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ plan })
    });

    setIsSubmitting(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(payload?.message ?? "Unable to update subscription plan.");
      return;
    }

    setMessage(`Plan changed to ${subscriptionPlans[plan].label}.`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Subscription overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <p>Current plan: {snapshot.planLabel}</p>
          <p>Status: {snapshot.status}</p>
          <p>Current period: {snapshot.periodKey}</p>
          <p>
            Renewal:
            {" "}
            {snapshot.currentPeriodEnd ? new Date(snapshot.currentPeriodEnd).toLocaleDateString() : "Not set"}
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-3">
        {Object.entries(subscriptionPlans).map(([planKey, plan]) => {
          const planId = planKey as SubscriptionPlan;
          const isCurrent = snapshot.plan === planId;

          return (
            <Card key={planId} className={isCurrent ? "border-primary shadow-sm shadow-primary/10" : undefined}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{plan.label}</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold">{plan.priceLabel}</p>
                    <p className="text-xs text-muted-foreground">internal tier</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {plan.highlights.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                {canManage ? (
                  <Button
                    className="w-full"
                    disabled={isCurrent || isSubmitting !== null}
                    onClick={() => changePlan(planId)}
                    variant={isCurrent ? "secondary" : "default"}
                  >
                    {isCurrent ? "Current plan" : isSubmitting === planId ? "Updating..." : `Switch to ${plan.label}`}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">Only organization admins can change plans.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Plan feature matrix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Feature</th>
                  {Object.entries(subscriptionPlans).map(([planKey, plan]) => (
                    <th key={planKey} className="py-3 pr-4 font-medium">
                      {plan.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subscriptionFeatureRows.map((feature) => (
                  <tr key={feature.key} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 font-medium">{feature.label}</td>
                    {Object.entries(subscriptionPlans).map(([planKey, plan]) => (
                      <td key={`${feature.key}-${planKey}`} className="py-3 pr-4 text-muted-foreground">
                        {plan.featureAccess[feature.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 lg:hidden">
            {Object.entries(subscriptionPlans).map(([planKey, plan]) => (
              <div key={planKey} className="rounded-2xl border p-4">
                <p className="font-semibold">{plan.label}</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {subscriptionFeatureRows.map((feature) => (
                    <div key={`${planKey}-${feature.key}`} className="flex items-start justify-between gap-4">
                      <span>{feature.label}</span>
                      <span className="text-right">{plan.featureAccess[feature.key]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Roadmap-tagged benefits are already modeled in the subscription system and can be enforced as soon as the
            product surfaces ship.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Usage and limits</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {usageRows.map((row) => (
            <div key={row.key} className="rounded-2xl border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{row.label}</p>
              <p className="mt-2 text-lg font-semibold">
                {snapshot.usage[row.key].toLocaleString("en-US")}
                {" / "}
                {formatSubscriptionLimit(snapshot.limits[row.key])}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

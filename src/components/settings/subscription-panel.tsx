"use client";

import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatSubscriptionLimit,
  subscriptionFeatureRows,
  subscriptionPlans,
  subscriptionTruthNotes
} from "@/lib/subscription-plans";

type SubscriptionSnapshot = {
  plan: SubscriptionPlan;
  planLabel: string;
  planDescription: string;
  status: SubscriptionStatus;
  hasStripeSubscription: boolean;
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
    artAnalysesRun: number;
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
    artAnalysesRun: number | null;
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
  { key: "gddsGenerated", label: "GDDs this month" },
  { key: "artAnalysesRun", label: "Art analyses this month" }
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
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function changePlan(plan: SubscriptionPlan) {
    setMessage(null);
    setIsSubmitting(plan);

    const isPaidPlan = plan !== SubscriptionPlan.FREE;
    const response = await fetch(isPaidPlan ? "/api/organizations/subscription/checkout" : "/api/organizations/subscription", {
      method: isPaidPlan ? "POST" : "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ plan })
    });

    setIsSubmitting(null);

    if (isPaidPlan) {
      const payload = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;

      if (!response.ok || !payload?.url) {
        setMessage(payload?.message ?? "Unable to start Stripe checkout.");
        return;
      }

      window.location.assign(payload.url);
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(payload?.message ?? "Unable to update subscription plan.");
      return;
    }

    setMessage(`Plan changed to ${subscriptionPlans[plan].label}.`);
    router.refresh();
  }

  async function openBillingPortal() {
    setMessage(null);
    setIsOpeningPortal(true);

    const response = await fetch("/api/organizations/subscription/portal", {
      method: "POST"
    });
    const payload = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;
    setIsOpeningPortal(false);

    if (!response.ok || !payload?.url) {
      setMessage(payload?.message ?? "Unable to open Stripe billing portal.");
      return;
    }

    window.location.assign(payload.url);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Subscription overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>Current plan: {snapshot.planLabel}</p>
            <p>Status: {snapshot.status}</p>
            <p>Current period: {snapshot.periodKey}</p>
            <p>
              Renewal:
              {" "}
              {snapshot.currentPeriodEnd ? new Date(snapshot.currentPeriodEnd).toLocaleDateString() : "Not set"}
            </p>
          </div>
          {canManage && snapshot.hasStripeSubscription ? (
            <div className="flex flex-wrap gap-3">
              <Button disabled={isOpeningPortal || isSubmitting !== null} type="button" onClick={openBillingPortal}>
                {isOpeningPortal ? "Opening billing..." : "Manage billing in Stripe"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Upgrade, downgrade, payment method changes, invoices, and cancellation now run through Stripe Billing Portal.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-3">
        {Object.entries(subscriptionPlans).map(([planKey, plan]) => {
          const planId = planKey as SubscriptionPlan;
          const isCurrent = snapshot.plan === planId;
          const canCheckout = snapshot.plan === SubscriptionPlan.FREE && planId !== SubscriptionPlan.FREE;
          const canDowngrade = planId === SubscriptionPlan.FREE && snapshot.plan !== SubscriptionPlan.FREE && !snapshot.hasStripeSubscription;
          const canManageInStripe = snapshot.hasStripeSubscription && !isCurrent;
          const canSwitch = isCurrent || canCheckout || canDowngrade || canManageInStripe;

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
                    disabled={!canSwitch || isCurrent || isSubmitting !== null || isOpeningPortal}
                    onClick={canManageInStripe ? openBillingPortal : () => changePlan(planId)}
                    variant={isCurrent ? "secondary" : "default"}
                  >
                    {isCurrent
                      ? "Current plan"
                      : isSubmitting === planId
                        ? "Loading..."
                        : canCheckout
                          ? `Checkout ${plan.label}`
                          : canManageInStripe
                            ? isOpeningPortal
                              ? "Opening billing..."
                              : "Manage in billing"
                          : canDowngrade
                            ? "Move to Free"
                            : "Coming soon"}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">Only organization admins can change plans.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        Free-to-paid upgrades start in Stripe Checkout. Once a paid subscription is active, billing changes are managed through Stripe Billing Portal.
      </p>
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
          <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Official live scope</p>
            <div className="mt-3 space-y-2">
              {subscriptionTruthNotes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          </div>
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

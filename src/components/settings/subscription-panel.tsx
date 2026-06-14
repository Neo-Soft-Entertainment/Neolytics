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
  { key: "seats", label: "Assentos" },
  { key: "workspaces", label: "Áreas de trabalho" },
  { key: "savedGames", label: "Jogos salvos" },
  { key: "competitorSets", label: "Conjuntos de concorrentes" },
  { key: "projects", label: "Projetos ativos" },
  { key: "reportsGenerated", label: "Relatórios neste mês" },
  { key: "exportsGenerated", label: "Exportações neste mês" },
  { key: "projectAnalysesRun", label: "Análises neste mês" },
  { key: "gddsGenerated", label: "GDDs neste mês" },
  { key: "artAnalysesRun", label: "Análises de arte neste mês" }
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
        let resolvedValue0: any;
    if (isPaidPlan) {
      resolvedValue0 = "/api/organizations/subscription/checkout";
    } else {
      resolvedValue0 = "/api/organizations/subscription";
    }
    let resolvedValue1: any;
    if (isPaidPlan) {
      resolvedValue1 = "POST";
    } else {
      resolvedValue1 = "PATCH";
    }
const response = await fetch(resolvedValue0, {
      method: resolvedValue1,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ plan })
    });

    setIsSubmitting(null);

    if (isPaidPlan) {
      const payload = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;

      if (!response.ok || !payload?.url) {
        setMessage(payload?.message ?? "Não foi possível iniciar o checkout da Stripe.");
        return;
      }

      window.location.assign(payload.url);
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(payload?.message ?? "Não foi possível atualizar o plano da assinatura.");
      return;
    }

    setMessage(`Plano alterado para ${subscriptionPlans[plan].label}.`);
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
      setMessage(payload?.message ?? "Não foi possível abrir o portal de cobrança da Stripe.");
      return;
    }

    window.location.assign(payload.url);
  }

    let resolvedValue2: any;
  if (snapshot.currentPeriodEnd) {
    resolvedValue2 = new Date(snapshot.currentPeriodEnd).toLocaleDateString();
  } else {
    resolvedValue2 = "Não definido";
  }
  let resolvedValue3: any;
  if (canManage && snapshot.hasStripeSubscription) {
        let resolvedValue7: any;
    if (isOpeningPortal) {
      resolvedValue7 = "Abrindo cobrança...";
    } else {
      resolvedValue7 = "Gerenciar cobrança na Stripe";
    }
resolvedValue3 = (
            <div className="flex flex-wrap gap-3">
              <Button disabled={isOpeningPortal || isSubmitting !== null} type="button" onClick={openBillingPortal}>
                {resolvedValue7}
              </Button>
              <p className="text-sm text-muted-foreground">
                Upgrade, downgrade, troca de método de pagamento, faturas e cancelamento agora passam pelo Portal de Cobrança da Stripe.
              </p>
            </div>
          );
  } else {
    resolvedValue3 = null;
  }
  let resolvedValue6: any;
  if (message) {
    resolvedValue6 = <p className="text-sm text-muted-foreground">{message}</p>;
  } else {
    resolvedValue6 = null;
  }
return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Visão geral da assinatura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>Plano atual: {snapshot.planLabel}</p>
            <p>Status: {snapshot.status}</p>
            <p>Período atual: {snapshot.periodKey}</p>
            <p>
              Renovação:
              {" "}
              {resolvedValue2}
            </p>
          </div>
          {resolvedValue3}
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

                    let resolvedValue4: any;
          if (isCurrent) {
            resolvedValue4 = "border-primary shadow-sm shadow-primary/10";
          } else {
            resolvedValue4 = undefined;
          }
          let resolvedValue5: any;
          if (canManage) {
                        let resolvedValue8: any;
            if (canManageInStripe) {
              resolvedValue8 = openBillingPortal;
            } else {
              resolvedValue8 = () => changePlan(planId);
            }
            let resolvedValue9: any;
            if (isCurrent) {
              resolvedValue9 = "secondary";
            } else {
              resolvedValue9 = "default";
            }
            let resolvedValue10: any;
            if (isCurrent) {
              resolvedValue10 = "Plano atual";
            } else {
                            let resolvedValue11: any;
              if (isSubmitting === planId) {
                resolvedValue11 = "Carregando...";
              } else {
                                let resolvedValue12: any;
                if (canCheckout) {
                  resolvedValue12 = `Iniciar teste ${plan.label}`;
                } else {
                                    let resolvedValue13: any;
                  if (canManageInStripe) {
                                        let resolvedValue14: any;
                    if (isOpeningPortal) {
                      resolvedValue14 = "Abrindo cobrança...";
                    } else {
                      resolvedValue14 = "Gerenciar na cobrança";
                    }
resolvedValue13 = resolvedValue14;
                  } else {
                                        let resolvedValue15: any;
                    if (canDowngrade) {
                      resolvedValue15 = "Mover para Free";
                    } else {
                      resolvedValue15 = "Em breve";
                    }
resolvedValue13 = resolvedValue15;
                  }
resolvedValue12 = resolvedValue13;
                }
resolvedValue11 = resolvedValue12;
              }
resolvedValue10 = resolvedValue11;
            }
resolvedValue5 = (
                  <Button
                    className="w-full"
                    disabled={!canSwitch || isCurrent || isSubmitting !== null || isOpeningPortal}
                    onClick={resolvedValue8}
                    variant={resolvedValue9}
                  >
                    {resolvedValue10}
                  </Button>
                );
          } else {
            resolvedValue5 = (
                  <p className="text-xs text-muted-foreground">Apenas administradores da organização podem alterar planos.</p>
                );
          }
return (
            <Card key={planId} className={resolvedValue4}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{plan.label}</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold">{plan.priceLabel}</p>
                    <p className="text-xs text-muted-foreground">nível interno</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {plan.highlights.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                {resolvedValue5}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        Upgrades do Free para planos pagos começam com 7 dias de teste no Stripe Checkout. Quando uma assinatura paga está ativa, mudanças de cobrança são gerenciadas pelo Portal de Cobrança da Stripe.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Matriz de recursos dos planos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Recurso</th>
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
            <p className="font-medium text-foreground">Escopo oficial ativo</p>
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
          <CardTitle>Uso e limites</CardTitle>
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
      {resolvedValue6}
    </div>
  );
}

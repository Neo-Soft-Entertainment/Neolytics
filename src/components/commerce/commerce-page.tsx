"use client";

import {
  CommerceChannelType,
  CommerceFulfillmentStatus,
  CommerceOrderStatus,
  CommercePaymentStatus,
  MarketingCampaignChannel,
  MarketingCampaignObjective,
  MarketingCampaignStatus
} from "@prisma/client";
import { FormEvent, useState } from "react";

import { PageHero } from "@/components/app-shell/page-hero";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatNumber } from "@/lib/utils";

const channelTypes = Object.values(CommerceChannelType);
const orderStatuses = Object.values(CommerceOrderStatus);
const fulfillmentStatuses = Object.values(CommerceFulfillmentStatus);
const paymentStatuses = Object.values(CommercePaymentStatus);
const campaignChannels = Object.values(MarketingCampaignChannel);
const campaignObjectives = Object.values(MarketingCampaignObjective);
const campaignStatuses = Object.values(MarketingCampaignStatus);
const commerceLabels: Record<string, string> = {
  ACTIVE: "Ativa",
  AFFILIATE: "Afiliado",
  AWARENESS: "Reconhecimento",
  CANCELLED: "Cancelado",
  CONFIRMED: "Confirmado",
  CONTENT_CREATOR: "Criador de conteúdo",
  CONVERSIONS: "Conversões",
  DELIVERED: "Entregue",
  DIRECT: "Direto",
  DISCORD: "Discord",
  DRAFT: "Rascunho",
  EPIC_STORE: "Epic Store",
  FAILED: "Falhou",
  MARKETPLACE: "Marketplace",
  NEWSLETTER: "Newsletter",
  ORGANIC_SOCIAL: "Social orgânico",
  PAID: "Pago",
  PAID_SOCIAL: "Social pago",
  PARTNER: "Parceiro",
  PAUSED: "Pausada",
  PENDING: "Pendente",
  PLANNED: "Planejada",
  PRESS: "Imprensa",
  REFUNDED: "Reembolsado",
  SHIPPED: "Enviado",
  STEAM_EVENT: "Evento Steam",
  STEAM_STORE: "Loja Steam",
  WISHLISTS: "Wishlists"
};

type CommerceData = {
  channels: Array<{
    id: string;
    name: string;
    type: CommerceChannelType;
    externalCode: string | null;
    active: boolean;
    notes: string | null;
    createdAt: string;
  }>;
  orders: Array<{
    id: string;
    channelId: string | null;
    projectId: string | null;
    orderNumber: string;
    customerName: string;
    customerEmail: string | null;
    status: CommerceOrderStatus;
    fulfillmentStatus: CommerceFulfillmentStatus;
    paymentStatus: CommercePaymentStatus;
    currencyCode: string;
    grossCents: number;
    netCents: number;
    quantity: number;
    expectedShipAt: string | null;
    fulfilledAt: string | null;
    createdAt: string;
    channel: { id: string; name: string; type: CommerceChannelType } | null;
    project: { id: string; name: string } | null;
    createdBy: { id: string; name: string | null; email: string };
  }>;
  campaigns: Array<{
    id: string;
    projectId: string | null;
    name: string;
    channel: MarketingCampaignChannel;
    objective: MarketingCampaignObjective;
    status: MarketingCampaignStatus;
    currencyCode: string;
    budgetCents: number;
    spendCents: number;
    impressions: number;
    clicks: number;
    wishlists: number;
    demoDownloads: number;
    conversions: number;
    revenueCents: number;
    startsAt: string | null;
    endsAt: string | null;
    notes: string | null;
    createdAt: string;
    project: { id: string; name: string } | null;
    createdBy: { id: string; name: string | null; email: string };
  }>;
  projects: Array<{
    id: string;
    name: string;
    stage: string;
  }>;
  channelPerformance: Array<{
    channel: MarketingCampaignChannel;
    campaignsCount: number;
    spendCents: number;
    revenueCents: number;
    impressions: number;
    clicks: number;
    wishlists: number;
    demoDownloads: number;
    conversions: number;
    roas: number | null;
    clickThroughRate: number | null;
    conversionRate: number | null;
    costPerWishlistCents: number | null;
  }>;
  projectSignals: Array<{
    project: { id: string; name: string; stage: string };
    activeCampaigns: number;
    salesCents: number;
    marketingSpendCents: number;
    attributedRevenueCents: number;
    wishlists: number;
    demoDownloads: number;
    readinessScore: number;
    roas: number | null;
  }>;
  summary: {
    openOrders: number;
    pendingFulfillment: number;
    paidOrders: number;
    netSalesCents: number;
    activeCampaigns: number;
    marketingSpendCents: number;
    marketingBudgetCents: number;
    attributedRevenueCents: number;
    wishlists: number;
    demoDownloads: number;
    campaignConversions: number;
    roas: number | null;
    conversionRate: number | null;
    costPerWishlistCents: number | null;
    commercialRevenueCents: number;
  };
};

function getField(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getCents(formData: FormData, name: string) {
  const value = Number(getField(formData, name) || "0");
  return Math.round(value * 100);
}

function getInteger(formData: FormData, name: string) {
  return Number(getField(formData, name) || "0");
}

function formatRatio(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return `${value.toFixed(2)}x`;
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return `${value.toFixed(1)}%`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleDateString();
}

function getSelectClassName() {
  return "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
}

function labelFor(value: string) {
  return commerceLabels[value] ?? value.replaceAll("_", " ");
}

export function CommercePage({
  canAccessCommerceOps,
  canManage,
  data: initialData,
  organizationName,
  planLabel
}: {
  canAccessCommerceOps: boolean;
  canManage: boolean;
  data: CommerceData | null;
  organizationName: string;
  planLabel: string;
}) {
  const [data, setData] = useState(initialData);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const previousData = data;
    const externalCode = getField(formData, "externalCode");
    const notes = getField(formData, "notes");
    const optimisticChannel = {
      id: `optimistic-channel-${Date.now()}`,
      name: getField(formData, "name"),
      type: getField(formData, "type") as CommerceChannelType,
      externalCode: externalCode || null,
      active: true,
      notes: notes || null,
      createdAt: new Date().toISOString()
    };

    setData((current: any) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        channels: [optimisticChannel, ...current.channels]
      };
    });

    const response = await fetch("/api/commerce/channels", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: optimisticChannel.name,
        type: optimisticChannel.type,
        externalCode,
        notes
      })
    });
    const payload = await response.json().catch(() => null);

    setIsSubmitting(false);

    if (!response.ok) {
      setData(previousData);
      setError((payload as { message?: string } | null)?.message ?? "Não foi possível criar o canal de vendas.");
      return;
    }

    setData((current: any) => {
      if (!current || !payload) {
        return current;
      }

      return {
        ...current,
        channels: current.channels.map((channel: any) => {
          if (channel.id !== optimisticChannel.id) {
            return channel;
          }

          return payload as CommerceData["channels"][number];
        })
      };
    });
    form.reset();
    setMessage("Canal de vendas criado.");
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const expectedShipAt = getField(formData, "expectedShipAt");
    const channelId = getField(formData, "channelId");
    const projectId = getField(formData, "projectId");
    const selectedChannel = data?.channels.find((channel: any) => channel.id === channelId) ?? null;
    const selectedProject = data?.projects.find((project) => project.id === projectId) ?? null;
    const previousData = data;
    const optimisticOrder = {
      id: `optimistic-order-${Date.now()}`,
      channelId: channelId || null,
      projectId: projectId || null,
      orderNumber: getField(formData, "orderNumber"),
      customerName: getField(formData, "customerName"),
      customerEmail: getField(formData, "customerEmail") || null,
      status: getField(formData, "status") as CommerceOrderStatus,
      fulfillmentStatus: getField(formData, "fulfillmentStatus") as CommerceFulfillmentStatus,
      paymentStatus: getField(formData, "paymentStatus") as CommercePaymentStatus,
      currencyCode: getField(formData, "currencyCode") || "USD",
      grossCents: getCents(formData, "grossAmount"),
      netCents: getCents(formData, "netAmount"),
      quantity: Number(getField(formData, "quantity") || "1"),
      expectedShipAt: expectedShipAt || null,
      fulfilledAt: null,
      createdAt: new Date().toISOString(),
      channel: selectedChannel,
      project: selectedProject,
      createdBy: { id: "optimistic-user", name: "Você", email: "Você" }
    };

    setData((current: any) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        orders: [optimisticOrder, ...current.orders],
        summary: {
          ...current.summary,
          openOrders: current.summary.openOrders + 1,
          netSalesCents: current.summary.netSalesCents + optimisticOrder.netCents,
          commercialRevenueCents: current.summary.commercialRevenueCents + optimisticOrder.netCents
        }
      };
    });

    const response = await fetch("/api/commerce/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channelId,
        projectId,
        orderNumber: getField(formData, "orderNumber"),
        customerName: getField(formData, "customerName"),
        customerEmail: getField(formData, "customerEmail"),
        status: getField(formData, "status"),
        fulfillmentStatus: getField(formData, "fulfillmentStatus"),
        paymentStatus: getField(formData, "paymentStatus"),
        currencyCode: getField(formData, "currencyCode") || "USD",
        grossCents: getCents(formData, "grossAmount"),
        netCents: getCents(formData, "netAmount"),
        quantity: Number(getField(formData, "quantity") || "1"),
        expectedShipAt: expectedShipAt || null,
        notes: getField(formData, "notes")
      })
    });
    const payload = await response.json().catch(() => null);

    setIsSubmitting(false);

    if (!response.ok) {
      setData(previousData);
      setError((payload as { message?: string } | null)?.message ?? "Não foi possível criar o pedido.");
      return;
    }

    setData((current: any) => {
      if (!current || !payload) {
        return current;
      }

      return {
        ...current,
        orders: current.orders.map((order: any) => {
          if (order.id !== optimisticOrder.id) {
            return order;
          }

          return payload as CommerceData["orders"][number];
        })
      };
    });
    form.reset();
    setMessage("Pedido criado.");
  }

  async function submitCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const startsAt = getField(formData, "startsAt");
    const endsAt = getField(formData, "endsAt");
    const projectId = getField(formData, "projectId");
    const selectedProject = data?.projects.find((project) => project.id === projectId) ?? null;
    const previousData = data;
    const optimisticCampaign = {
      id: `optimistic-campaign-${Date.now()}`,
      projectId: projectId || null,
      name: getField(formData, "name"),
      channel: getField(formData, "channel") as MarketingCampaignChannel,
      objective: getField(formData, "objective") as MarketingCampaignObjective,
      status: getField(formData, "status") as MarketingCampaignStatus,
      currencyCode: getField(formData, "currencyCode") || "USD",
      budgetCents: getCents(formData, "budgetAmount"),
      spendCents: getCents(formData, "spendAmount"),
      impressions: getInteger(formData, "impressions"),
      clicks: getInteger(formData, "clicks"),
      wishlists: getInteger(formData, "wishlists"),
      demoDownloads: getInteger(formData, "demoDownloads"),
      conversions: getInteger(formData, "conversions"),
      revenueCents: getCents(formData, "revenueAmount"),
      startsAt: startsAt || null,
      endsAt: endsAt || null,
      notes: getField(formData, "notes") || null,
      createdAt: new Date().toISOString(),
      project: selectedProject,
      createdBy: { id: "optimistic-user", name: "Você", email: "Você" }
    };

    setData((current: any) => {
      if (!current) {
        return current;
      }

      let activeCampaigns = current.summary.activeCampaigns;

      if (optimisticCampaign.status === MarketingCampaignStatus.ACTIVE) {
        activeCampaigns += 1;
      }

      return {
        ...current,
        campaigns: [optimisticCampaign, ...current.campaigns],
        summary: {
          ...current.summary,
          activeCampaigns,
          marketingSpendCents: current.summary.marketingSpendCents + optimisticCampaign.spendCents,
          marketingBudgetCents: current.summary.marketingBudgetCents + optimisticCampaign.budgetCents,
          attributedRevenueCents: current.summary.attributedRevenueCents + optimisticCampaign.revenueCents,
          wishlists: current.summary.wishlists + optimisticCampaign.wishlists,
          demoDownloads: current.summary.demoDownloads + optimisticCampaign.demoDownloads,
          campaignConversions: current.summary.campaignConversions + optimisticCampaign.conversions
        }
      };
    });

    const response = await fetch("/api/commerce/campaigns", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        projectId,
        name: optimisticCampaign.name,
        channel: optimisticCampaign.channel,
        objective: optimisticCampaign.objective,
        status: optimisticCampaign.status,
        currencyCode: optimisticCampaign.currencyCode,
        budgetCents: optimisticCampaign.budgetCents,
        spendCents: optimisticCampaign.spendCents,
        impressions: optimisticCampaign.impressions,
        clicks: optimisticCampaign.clicks,
        wishlists: optimisticCampaign.wishlists,
        demoDownloads: optimisticCampaign.demoDownloads,
        conversions: optimisticCampaign.conversions,
        revenueCents: optimisticCampaign.revenueCents,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        notes: optimisticCampaign.notes
      })
    });
    const payload = await response.json().catch(() => null);

    setIsSubmitting(false);

    if (!response.ok) {
      setData(previousData);
      setError((payload as { message?: string } | null)?.message ?? "Não foi possível criar a campanha de marketing.");
      return;
    }

    setData((current: any) => {
      if (!current || !payload) {
        return current;
      }

      return {
        ...current,
        campaigns: current.campaigns.map((campaign: any) => {
          if (campaign.id !== optimisticCampaign.id) {
            return campaign;
          }

          return payload as CommerceData["campaigns"][number];
        })
      };
    });
    form.reset();
    setMessage("Campanha de marketing criada.");
  }

  if (!canAccessCommerceOps) {
    return (
      <div className="space-y-6">
        <PageHero
          title="Operações comerciais"
          description="Gerencie go-to-market, análise de marketing, canais de venda e repasse comercial do estúdio."
          actions={(
            <>
              <Badge variant="secondary">ERP de estúdio de jogos</Badge>
              <Badge variant="secondary">Análise de marketing</Badge>
              <Badge variant="secondary">Plano: {planLabel}</Badge>
            </>
          )}
        />
        <Card>
          <CardContent className="p-5 text-sm">
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-500">Upgrade necessário</p>
            <p className="mt-2 font-medium">Operações comerciais começam no plano Plus.</p>
            <p className="mt-2 text-muted-foreground">
              Faça upgrade para rodar campanhas, prontidão de lançamento, análise de canais, vendas e entrega.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

    let resolvedValue0: any;
  if (data.summary.costPerWishlistCents) {
    resolvedValue0 = `${formatCurrency(data.summary.costPerWishlistCents)} CPW`;
  } else {
    resolvedValue0 = "Captação de wishlist";
  }
  let resolvedValue1: any;
  if ((message || error)) {
        let resolvedValue11: any;
    if (message) {
      resolvedValue11 = <p className="text-emerald-600">{message}</p>;
    } else {
      resolvedValue11 = null;
    }
    let resolvedValue12: any;
    if (error) {
      resolvedValue12 = <p className="text-destructive">{error}</p>;
    } else {
      resolvedValue12 = null;
    }
resolvedValue1 = (
        <div className="rounded-lg border border-white/10 bg-white/55 px-4 py-3 text-sm dark:bg-white/[0.04]">
          {resolvedValue11}
          {resolvedValue12}
        </div>
      );
  } else {
    resolvedValue1 = null;
  }
  let resolvedValue2: any;
  if (data.projectSignals.length > 0) {
    resolvedValue2 = data.projectSignals.map((signal) => {
      let resolvedValue13: any;
      if (signal.readinessScore >= 70) {
        resolvedValue13 = "default";
      } else {
        resolvedValue13 = "secondary";
      }
      return (
                      <TableRow key={signal.project.id}>
                        <TableCell>
                          <p className="font-medium">{signal.project.name}</p>
                          <p className="text-xs text-muted-foreground">{signal.project.stage.replaceAll("_", " ")}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={resolvedValue13}>{signal.readinessScore}/100</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(signal.wishlists)}</TableCell>
                        <TableCell className="text-right">{formatNumber(signal.demoDownloads)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(signal.marketingSpendCents)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(signal.salesCents + signal.attributedRevenueCents)}</TableCell>
                      </TableRow>
                    );
    });
  } else {
    resolvedValue2 = (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground">
                          Ainda não há sinais de marketing por projeto.
                        </TableCell>
                      </TableRow>
                    );
  }
  let resolvedValue3: any;
  if (data.channelPerformance.length > 0) {
    resolvedValue3 = data.channelPerformance.map((channel: any) => {
      let resolvedValue14: any;
      if (channel.costPerWishlistCents) {
        resolvedValue14 = formatCurrency(channel.costPerWishlistCents);
      } else {
        resolvedValue14 = "N/A";
      }
      return (
                      <TableRow key={channel.channel}>
                        <TableCell>
                          <p className="font-medium">{labelFor(channel.channel)}</p>
                          <p className="text-xs text-muted-foreground">{channel.campaignsCount} campanhas</p>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(channel.spendCents)}</TableCell>
                        <TableCell className="text-right">{formatRatio(channel.roas)}</TableCell>
                        <TableCell className="text-right">{formatPercent(channel.clickThroughRate)}</TableCell>
                        <TableCell className="text-right">{formatNumber(channel.wishlists)}</TableCell>
                        <TableCell className="text-right">{resolvedValue14}</TableCell>
                      </TableRow>
                    );
    });
  } else {
    resolvedValue3 = (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground">
                          Ainda não há dados de canais de marketing.
                        </TableCell>
                      </TableRow>
                    );
  }
  let resolvedValue4: any;
  if (data.projectSignals.length > 0) {
    resolvedValue4 = data.projectSignals.map((signal) => (
                      <TableRow key={signal.project.id}>
                        <TableCell className="font-medium">{signal.project.name}</TableCell>
                        <TableCell className="text-right">{formatNumber(signal.activeCampaigns)}</TableCell>
                        <TableCell className="text-right">{formatRatio(signal.roas)}</TableCell>
                        <TableCell className="text-right">{formatNumber(signal.wishlists)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(signal.attributedRevenueCents)}</TableCell>
                      </TableRow>
                    ));
  } else {
    resolvedValue4 = (
                      <TableRow>
                        <TableCell colSpan={5} className="text-muted-foreground">
                          Ainda não há dados de marketing por projeto.
                        </TableCell>
                      </TableRow>
                    );
  }
  let resolvedValue5: any;
  if (data.campaigns.length > 0) {
    resolvedValue5 = data.campaigns.map((campaign: any) => {
      let resolvedValue15: any;
      if (campaign.status === "ACTIVE") {
        resolvedValue15 = "default";
      } else {
        resolvedValue15 = "secondary";
      }
      return (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">{labelFor(campaign.channel)}</p>
                      </TableCell>
                      <TableCell>{campaign.project?.name ?? "Sem projeto"}</TableCell>
                      <TableCell>{labelFor(campaign.objective)}</TableCell>
                      <TableCell>
                        <Badge variant={resolvedValue15}>{labelFor(campaign.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(campaign.spendCents, campaign.currencyCode)}</TableCell>
                      <TableCell className="text-right">{formatNumber(campaign.wishlists)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(campaign.revenueCents, campaign.currencyCode)}</TableCell>
                    </TableRow>
                  );
    });
  } else {
    resolvedValue5 = (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground">
                        Ainda não há campanhas de marketing.
                      </TableCell>
                    </TableRow>
                  );
  }
  let resolvedValue6: any;
  if (data.orders.length > 0) {
    resolvedValue6 = data.orders.map((order: any) => {
      let resolvedValue16: any;
      if (order.paymentStatus === "PAID") {
        resolvedValue16 = "default";
      } else {
        resolvedValue16 = "secondary";
      }
      let resolvedValue17: any;
      if (order.fulfillmentStatus === "BLOCKED") {
        resolvedValue17 = "destructive";
      } else {
        resolvedValue17 = "secondary";
      }
      return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{order.customerName}</p>
                      </TableCell>
                      <TableCell>{order.channel?.name ?? "Direto"}</TableCell>
                      <TableCell>{order.project?.name ?? "Sem projeto"}</TableCell>
                      <TableCell>
                        <Badge variant={resolvedValue16}>{labelFor(order.paymentStatus)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={resolvedValue17}>{labelFor(order.fulfillmentStatus)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(order.netCents, order.currencyCode)}</TableCell>
                      <TableCell>{formatDate(order.expectedShipAt)}</TableCell>
                    </TableRow>
                  );
    });
  } else {
    resolvedValue6 = (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground">
                        Ainda não há pedidos comerciais.
                      </TableCell>
                    </TableRow>
                  );
  }
  let resolvedValue7: any;
  if (data.channels.length > 0) {
    resolvedValue7 = data.channels.map((channel: any) => {
      let resolvedValue18: any;
      if (channel.active) {
        resolvedValue18 = "default";
      } else {
        resolvedValue18 = "secondary";
      }
      let resolvedValue19: any;
      if (channel.active) {
        resolvedValue19 = "Ativo";
      } else {
        resolvedValue19 = "Inativo";
      }
      return (
                    <TableRow key={channel.id}>
                      <TableCell className="font-medium">{channel.name}</TableCell>
                      <TableCell>{labelFor(channel.type)}</TableCell>
                      <TableCell>{channel.externalCode || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={resolvedValue18}>{resolvedValue19}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate">{channel.notes || "N/A"}</TableCell>
                    </TableRow>
                  );
    });
  } else {
    resolvedValue7 = (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        Ainda não há canais de venda.
                      </TableCell>
                    </TableRow>
                  );
  }
  let resolvedValue8: any;
  if (isSubmitting) {
    resolvedValue8 = "Salvando...";
  } else {
    resolvedValue8 = "Criar campanha";
  }
  let resolvedValue9: any;
  if (isSubmitting) {
    resolvedValue9 = "Salvando...";
  } else {
    resolvedValue9 = "Criar pedido";
  }
  let resolvedValue10: any;
  if (isSubmitting) {
    resolvedValue10 = "Salvando...";
  } else {
    resolvedValue10 = "Criar";
  }
return (
    <div className="space-y-6">
      <PageHero
        title="Operações comerciais"
        description={`Gerencie campanhas de lançamento, análise de marketing, canais de venda e repasse de receita para ${organizationName}.`}
        actions={(
          <>
            <Badge variant="secondary">ROI de marketing</Badge>
            <Badge variant="secondary">Prontidão de lançamento</Badge>
            <Badge variant="secondary">Operação de vendas</Badge>
          </>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Receita comercial" value={formatCurrency(data.summary.commercialRevenueCents)} hint="Pedidos pagos + atribuição de campanha" />
        <KpiCard label="ROAS de marketing" value={formatRatio(data.summary.roas)} hint={`${formatCurrency(data.summary.marketingSpendCents)} investidos`} />
        <KpiCard label="Wishlists" value={formatNumber(data.summary.wishlists)} hint={resolvedValue0} />
        <KpiCard label="Campanhas ativas" value={formatNumber(data.summary.activeCampaigns)} hint={`${formatNumber(data.summary.demoDownloads)} downloads de demo`} />
      </div>

      {resolvedValue1}

      <Tabs defaultValue="command">
        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-[1rem] border border-white/10 bg-white/55 p-1.5 backdrop-blur dark:bg-white/[0.04]">
          <TabsTrigger value="command">Central de comando</TabsTrigger>
          <TabsTrigger value="marketing">Análise de marketing</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="channels">Canais</TabsTrigger>
          <TabsTrigger value="new-campaign">Nova campanha</TabsTrigger>
          <TabsTrigger value="new-order">Novo pedido</TabsTrigger>
          <TabsTrigger value="new-channel">Novo canal</TabsTrigger>
        </TabsList>
        <p className="mt-2 text-sm text-muted-foreground">
          Navegue entre inteligência de lançamento, execução de campanhas, pedidos e canais de venda do pipeline do estúdio.
        </p>

        <TabsContent value="command">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Quadro operacional de lançamento</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Prontidão</TableHead>
                      <TableHead className="text-right">Wishlists</TableHead>
                      <TableHead className="text-right">Demos</TableHead>
                      <TableHead className="text-right">Marketing</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolvedValue2}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Funil de marketing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/45 p-3 dark:bg-white/[0.03]">
                    <span className="text-muted-foreground">Investimento</span>
                    <span className="font-medium">{formatCurrency(data.summary.marketingSpendCents)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/45 p-3 dark:bg-white/[0.03]">
                    <span className="text-muted-foreground">Receita atribuída</span>
                    <span className="font-medium">{formatCurrency(data.summary.attributedRevenueCents)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/45 p-3 dark:bg-white/[0.03]">
                    <span className="text-muted-foreground">Taxa de conversão</span>
                    <span className="font-medium">{formatPercent(data.summary.conversionRate)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/45 p-3 dark:bg-white/[0.03]">
                    <span className="text-muted-foreground">Pedidos abertos</span>
                    <span className="font-medium">{formatNumber(data.summary.openOrders)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Próximas ações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Vincule cada campanha a um projeto antes do lançamento.</p>
                  <p>Use wishlists e downloads de demo como sinais iniciais de demanda.</p>
                  <p>Mova publishers, licenciamento e acordos diretos para pedidos quando os termos comerciais forem reais.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="marketing">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance por canal</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canal</TableHead>
                      <TableHead className="text-right">Investimento</TableHead>
                      <TableHead className="text-right">ROAS</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Wishlists</TableHead>
                      <TableHead className="text-right">CPW</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolvedValue3}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Análise de marketing por projeto</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projeto</TableHead>
                      <TableHead className="text-right">Ativas</TableHead>
                      <TableHead className="text-right">ROAS</TableHead>
                      <TableHead className="text-right">Wishlists</TableHead>
                      <TableHead className="text-right">Atribuída</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolvedValue4}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Campanhas de marketing</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Objetivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Investimento</TableHead>
                    <TableHead className="text-right">Wishlists</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolvedValue5}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Operações de pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                    <TableHead>Enviar até</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolvedValue6}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels">
          <Card>
            <CardHeader>
              <CardTitle>Canais de venda</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Código externo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolvedValue7}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new-campaign">
          <Card>
            <CardHeader>
              <CardTitle>Criar campanha de marketing</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 lg:grid-cols-4" onSubmit={submitCampaign}>
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="campaignName">Nome da campanha</Label>
                  <Input id="campaignName" name="name" placeholder="Steam Next Fest, ação com criadores, lançamento da demo..." disabled={!canManage} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignProjectId">Projeto</Label>
                  <select id="campaignProjectId" name="projectId" className={getSelectClassName()} disabled={!canManage}>
                    <option value="">Sem projeto</option>
                    {data.projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignStatus">Status</Label>
                  <select id="campaignStatus" name="status" className={getSelectClassName()} defaultValue={MarketingCampaignStatus.PLANNED} disabled={!canManage}>
                    {campaignStatuses.map((status) => (
                      <option key={status} value={status}>{labelFor(status)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignChannel">Canal</Label>
                  <select id="campaignChannel" name="channel" className={getSelectClassName()} defaultValue={MarketingCampaignChannel.STEAM_STORE} disabled={!canManage}>
                    {campaignChannels.map((channel: any) => (
                      <option key={channel} value={channel}>{labelFor(channel)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignObjective">Objetivo</Label>
                  <select id="campaignObjective" name="objective" className={getSelectClassName()} defaultValue={MarketingCampaignObjective.WISHLISTS} disabled={!canManage}>
                    {campaignObjectives.map((objective) => (
                      <option key={objective} value={objective}>{labelFor(objective)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignStartsAt">Início</Label>
                  <Input id="campaignStartsAt" name="startsAt" type="date" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignEndsAt">Fim</Label>
                  <Input id="campaignEndsAt" name="endsAt" type="date" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignCurrencyCode">Moeda</Label>
                  <Input id="campaignCurrencyCode" name="currencyCode" defaultValue="USD" maxLength={3} disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignBudgetAmount">Orçamento</Label>
                  <Input id="campaignBudgetAmount" name="budgetAmount" type="number" min="0" step="0.01" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignSpendAmount">Investimento</Label>
                  <Input id="campaignSpendAmount" name="spendAmount" type="number" min="0" step="0.01" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignRevenueAmount">Receita atribuída</Label>
                  <Input id="campaignRevenueAmount" name="revenueAmount" type="number" min="0" step="0.01" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignImpressions">Impressões</Label>
                  <Input id="campaignImpressions" name="impressions" type="number" min="0" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignClicks">Cliques</Label>
                  <Input id="campaignClicks" name="clicks" type="number" min="0" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignWishlists">Wishlists</Label>
                  <Input id="campaignWishlists" name="wishlists" type="number" min="0" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignDemoDownloads">Downloads da demo</Label>
                  <Input id="campaignDemoDownloads" name="demoDownloads" type="number" min="0" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignConversions">Conversões</Label>
                  <Input id="campaignConversions" name="conversions" type="number" min="0" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2 lg:col-span-3">
                  <Label htmlFor="campaignNotes">Notas de análise</Label>
                  <Textarea id="campaignNotes" name="notes" placeholder="Público, ângulo criativo, benchmark, hipótese do experimento ou próxima ação." disabled={!canManage} />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" disabled={!canManage || isSubmitting}>
                    {resolvedValue8}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new-order">
          <Card>
            <CardHeader>
              <CardTitle>Registrar pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 lg:grid-cols-4" onSubmit={submitOrder}>
                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Número do pedido</Label>
                  <Input id="orderNumber" name="orderNumber" placeholder="SO-1001" disabled={!canManage} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerName">Cliente</Label>
                  <Input id="customerName" name="customerName" placeholder="Publisher, cliente ou comprador" disabled={!canManage} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email do cliente</Label>
                  <Input id="customerEmail" name="customerEmail" type="email" placeholder="buyer@example.com" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="channelId">Canal</Label>
                  <select id="channelId" name="channelId" className={getSelectClassName()} disabled={!canManage}>
                    <option value="">Direto</option>
                    {data.channels.map((channel: any) => (
                      <option key={channel.id} value={channel.id}>{channel.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectId">Projeto</Label>
                  <select id="projectId" name="projectId" className={getSelectClassName()} disabled={!canManage}>
                    <option value="">Sem projeto</option>
                    {data.projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status do pedido</Label>
                  <select id="status" name="status" className={getSelectClassName()} defaultValue={CommerceOrderStatus.CONFIRMED} disabled={!canManage}>
                    {orderStatuses.map((status) => (
                      <option key={status} value={status}>{labelFor(status)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentStatus">Pagamento</Label>
                  <select id="paymentStatus" name="paymentStatus" className={getSelectClassName()} defaultValue={CommercePaymentStatus.PENDING} disabled={!canManage}>
                    {paymentStatuses.map((status) => (
                      <option key={status} value={status}>{labelFor(status)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fulfillmentStatus">Entrega</Label>
                  <select id="fulfillmentStatus" name="fulfillmentStatus" className={getSelectClassName()} defaultValue={CommerceFulfillmentStatus.PENDING} disabled={!canManage}>
                    {fulfillmentStatuses.map((status) => (
                      <option key={status} value={status}>{labelFor(status)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currencyCode">Moeda</Label>
                  <Input id="currencyCode" name="currencyCode" defaultValue="USD" maxLength={3} disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grossAmount">Valor bruto</Label>
                  <Input id="grossAmount" name="grossAmount" type="number" min="0" step="0.01" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="netAmount">Valor líquido</Label>
                  <Input id="netAmount" name="netAmount" type="number" min="0" step="0.01" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input id="quantity" name="quantity" type="number" min="1" defaultValue="1" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedShipAt">Envio previsto</Label>
                  <Input id="expectedShipAt" name="expectedShipAt" type="date" disabled={!canManage} />
                </div>
                <div className="space-y-2 lg:col-span-3">
                  <Label htmlFor="orderNotes">Observações</Label>
                  <Textarea id="orderNotes" name="notes" placeholder="Termos comerciais, notas de entrega ou repasse fiscal." disabled={!canManage} />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" disabled={!canManage || isSubmitting}>
                    {resolvedValue9}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new-channel">
          <Card>
            <CardHeader>
              <CardTitle>Criar canal de venda</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]" onSubmit={submitChannel}>
                <div className="space-y-2">
                  <Label htmlFor="channelName">Nome</Label>
                  <Input id="channelName" name="name" placeholder="Steam, Epic, varejo, publisher..." disabled={!canManage} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="channelType">Tipo</Label>
                  <select id="channelType" name="type" className={getSelectClassName()} defaultValue={CommerceChannelType.DIRECT} disabled={!canManage}>
                    {channelTypes.map((type) => (
                      <option key={type} value={type}>{labelFor(type)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="externalCode">Código externo</Label>
                  <Input id="externalCode" name="externalCode" placeholder="ID da loja, ID do marketplace" disabled={!canManage} />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" disabled={!canManage || isSubmitting}>
                    {resolvedValue10}
                  </Button>
                </div>
                <div className="space-y-2 lg:col-span-4">
                  <Label htmlFor="channelNotes">Observações</Label>
                  <Textarea id="channelNotes" name="notes" placeholder="Notas operacionais, responsável, status de integração ou comportamento fiscal." disabled={!canManage} />
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

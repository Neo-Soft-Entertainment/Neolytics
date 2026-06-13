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
import { useRouter } from "next/navigation";
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

export function CommercePage({
  canAccessCommerceOps,
  canManage,
  data,
  organizationName,
  planLabel
}: {
  canAccessCommerceOps: boolean;
  canManage: boolean;
  data: CommerceData | null;
  organizationName: string;
  planLabel: string;
}) {
  const router = useRouter();
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
    const response = await fetch("/api/commerce/channels", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: getField(formData, "name"),
        type: getField(formData, "type"),
        externalCode: getField(formData, "externalCode"),
        notes: getField(formData, "notes")
      })
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload?.message ?? "Unable to create sales channel.");
      return;
    }

    form.reset();
    setMessage("Sales channel created.");
    router.refresh();
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const expectedShipAt = getField(formData, "expectedShipAt");
    const response = await fetch("/api/commerce/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channelId: getField(formData, "channelId"),
        projectId: getField(formData, "projectId"),
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
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload?.message ?? "Unable to create order.");
      return;
    }

    form.reset();
    setMessage("Order created.");
    router.refresh();
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
    const response = await fetch("/api/commerce/campaigns", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        projectId: getField(formData, "projectId"),
        name: getField(formData, "name"),
        channel: getField(formData, "channel"),
        objective: getField(formData, "objective"),
        status: getField(formData, "status"),
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
        notes: getField(formData, "notes")
      })
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload?.message ?? "Unable to create marketing campaign.");
      return;
    }

    form.reset();
    setMessage("Marketing campaign created.");
    router.refresh();
  }

  if (!canAccessCommerceOps) {
    return (
      <div className="space-y-6">
        <PageHero
          title="Commercial Operations"
          description="Run go-to-market, marketing analysis, sales channels, and commercial handoff for the studio."
          actions={(
            <>
              <Badge variant="secondary">Game Studio ERP</Badge>
              <Badge variant="secondary">Marketing analysis</Badge>
              <Badge variant="secondary">Plan: {planLabel}</Badge>
            </>
          )}
        />
        <Card>
          <CardContent className="p-5 text-sm">
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-500">Upgrade required</p>
            <p className="mt-2 font-medium">Commercial Operations starts on Plus.</p>
            <p className="mt-2 text-muted-foreground">
              Upgrade to run campaigns, launch readiness, channel analysis, sales, and fulfillment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Commercial Operations"
        description={`Run launch campaigns, marketing analysis, sales channels, and revenue handoff for ${organizationName}.`}
        actions={(
          <>
            <Badge variant="secondary">Marketing ROI</Badge>
            <Badge variant="secondary">Launch readiness</Badge>
            <Badge variant="secondary">Sales ops</Badge>
          </>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Commercial revenue" value={formatCurrency(data.summary.commercialRevenueCents)} hint="Paid orders + campaign attribution" />
        <KpiCard label="Marketing ROAS" value={formatRatio(data.summary.roas)} hint={`${formatCurrency(data.summary.marketingSpendCents)} spent`} />
        <KpiCard label="Wishlists" value={formatNumber(data.summary.wishlists)} hint={data.summary.costPerWishlistCents ? `${formatCurrency(data.summary.costPerWishlistCents)} CPW` : "Wishlist capture"} />
        <KpiCard label="Active campaigns" value={formatNumber(data.summary.activeCampaigns)} hint={`${formatNumber(data.summary.demoDownloads)} demo downloads`} />
      </div>

      {(message || error) ? (
        <div className="rounded-lg border border-white/10 bg-white/55 px-4 py-3 text-sm dark:bg-white/[0.04]">
          {message ? <p className="text-emerald-600">{message}</p> : null}
          {error ? <p className="text-destructive">{error}</p> : null}
        </div>
      ) : null}

      <Tabs defaultValue="command">
        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-[1rem] border border-white/10 bg-white/55 p-1.5 backdrop-blur dark:bg-white/[0.04]">
          <TabsTrigger value="command">Command center</TabsTrigger>
          <TabsTrigger value="marketing">Marketing analysis</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="new-campaign">New campaign</TabsTrigger>
          <TabsTrigger value="new-order">New order</TabsTrigger>
          <TabsTrigger value="new-channel">New channel</TabsTrigger>
        </TabsList>
        <p className="mt-2 text-sm text-muted-foreground">
          Move between launch intelligence, campaign execution, orders, and sales channels for the studio pipeline.
        </p>

        <TabsContent value="command">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Launch operating board</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Readiness</TableHead>
                      <TableHead className="text-right">Wishlists</TableHead>
                      <TableHead className="text-right">Demos</TableHead>
                      <TableHead className="text-right">Marketing</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.projectSignals.length > 0 ? data.projectSignals.map((signal) => (
                      <TableRow key={signal.project.id}>
                        <TableCell>
                          <p className="font-medium">{signal.project.name}</p>
                          <p className="text-xs text-muted-foreground">{signal.project.stage.replaceAll("_", " ")}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={signal.readinessScore >= 70 ? "default" : "secondary"}>{signal.readinessScore}/100</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(signal.wishlists)}</TableCell>
                        <TableCell className="text-right">{formatNumber(signal.demoDownloads)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(signal.marketingSpendCents)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(signal.salesCents + signal.attributedRevenueCents)}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground">
                          No project marketing signals yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Marketing funnel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/45 p-3 dark:bg-white/[0.03]">
                    <span className="text-muted-foreground">Spend</span>
                    <span className="font-medium">{formatCurrency(data.summary.marketingSpendCents)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/45 p-3 dark:bg-white/[0.03]">
                    <span className="text-muted-foreground">Attributed revenue</span>
                    <span className="font-medium">{formatCurrency(data.summary.attributedRevenueCents)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/45 p-3 dark:bg-white/[0.03]">
                    <span className="text-muted-foreground">Conversion rate</span>
                    <span className="font-medium">{formatPercent(data.summary.conversionRate)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/45 p-3 dark:bg-white/[0.03]">
                    <span className="text-muted-foreground">Open orders</span>
                    <span className="font-medium">{formatNumber(data.summary.openOrders)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Next actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Track every campaign against a project before launch.</p>
                  <p>Use wishlists and demo downloads as early demand signals.</p>
                  <p>Move publisher, licensing, and direct deals into orders when commercial terms are real.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="marketing">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Channel performance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">ROAS</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Wishlists</TableHead>
                      <TableHead className="text-right">CPW</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.channelPerformance.length > 0 ? data.channelPerformance.map((channel) => (
                      <TableRow key={channel.channel}>
                        <TableCell>
                          <p className="font-medium">{channel.channel.replaceAll("_", " ")}</p>
                          <p className="text-xs text-muted-foreground">{channel.campaignsCount} campaigns</p>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(channel.spendCents)}</TableCell>
                        <TableCell className="text-right">{formatRatio(channel.roas)}</TableCell>
                        <TableCell className="text-right">{formatPercent(channel.clickThroughRate)}</TableCell>
                        <TableCell className="text-right">{formatNumber(channel.wishlists)}</TableCell>
                        <TableCell className="text-right">{channel.costPerWishlistCents ? formatCurrency(channel.costPerWishlistCents) : "N/A"}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground">
                          No marketing channel data yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project marketing analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Active</TableHead>
                      <TableHead className="text-right">ROAS</TableHead>
                      <TableHead className="text-right">Wishlists</TableHead>
                      <TableHead className="text-right">Attributed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.projectSignals.length > 0 ? data.projectSignals.map((signal) => (
                      <TableRow key={signal.project.id}>
                        <TableCell className="font-medium">{signal.project.name}</TableCell>
                        <TableCell className="text-right">{formatNumber(signal.activeCampaigns)}</TableCell>
                        <TableCell className="text-right">{formatRatio(signal.roas)}</TableCell>
                        <TableCell className="text-right">{formatNumber(signal.wishlists)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(signal.attributedRevenueCents)}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-muted-foreground">
                          No project-level marketing data yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Marketing campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Objective</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Wishlists</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.campaigns.length > 0 ? data.campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">{campaign.channel.replaceAll("_", " ")}</p>
                      </TableCell>
                      <TableCell>{campaign.project?.name ?? "No project"}</TableCell>
                      <TableCell>{campaign.objective.replaceAll("_", " ")}</TableCell>
                      <TableCell>
                        <Badge variant={campaign.status === "ACTIVE" ? "default" : "secondary"}>{campaign.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(campaign.spendCents, campaign.currencyCode)}</TableCell>
                      <TableCell className="text-right">{formatNumber(campaign.wishlists)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(campaign.revenueCents, campaign.currencyCode)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground">
                        No marketing campaigns yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order operations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Fulfillment</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Ship by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.orders.length > 0 ? data.orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{order.customerName}</p>
                      </TableCell>
                      <TableCell>{order.channel?.name ?? "Direct"}</TableCell>
                      <TableCell>{order.project?.name ?? "No project"}</TableCell>
                      <TableCell>
                        <Badge variant={order.paymentStatus === "PAID" ? "default" : "secondary"}>{order.paymentStatus}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.fulfillmentStatus === "BLOCKED" ? "destructive" : "secondary"}>{order.fulfillmentStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(order.netCents, order.currencyCode)}</TableCell>
                      <TableCell>{formatDate(order.expectedShipAt)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground">
                        No commerce orders yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels">
          <Card>
            <CardHeader>
              <CardTitle>Sales channels</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>External code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.channels.length > 0 ? data.channels.map((channel) => (
                    <TableRow key={channel.id}>
                      <TableCell className="font-medium">{channel.name}</TableCell>
                      <TableCell>{channel.type}</TableCell>
                      <TableCell>{channel.externalCode || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={channel.active ? "default" : "secondary"}>{channel.active ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate">{channel.notes || "N/A"}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        No sales channels yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new-campaign">
          <Card>
            <CardHeader>
              <CardTitle>Create marketing campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 lg:grid-cols-4" onSubmit={submitCampaign}>
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="campaignName">Campaign name</Label>
                  <Input id="campaignName" name="name" placeholder="Steam Next Fest push, creator beat, demo launch..." disabled={!canManage} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignProjectId">Project</Label>
                  <select id="campaignProjectId" name="projectId" className={getSelectClassName()} disabled={!canManage}>
                    <option value="">No project</option>
                    {data.projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignStatus">Status</Label>
                  <select id="campaignStatus" name="status" className={getSelectClassName()} defaultValue={MarketingCampaignStatus.PLANNED} disabled={!canManage}>
                    {campaignStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignChannel">Channel</Label>
                  <select id="campaignChannel" name="channel" className={getSelectClassName()} defaultValue={MarketingCampaignChannel.STEAM_STORE} disabled={!canManage}>
                    {campaignChannels.map((channel) => (
                      <option key={channel} value={channel}>{channel.replaceAll("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignObjective">Objective</Label>
                  <select id="campaignObjective" name="objective" className={getSelectClassName()} defaultValue={MarketingCampaignObjective.WISHLISTS} disabled={!canManage}>
                    {campaignObjectives.map((objective) => (
                      <option key={objective} value={objective}>{objective.replaceAll("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignStartsAt">Starts</Label>
                  <Input id="campaignStartsAt" name="startsAt" type="date" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignEndsAt">Ends</Label>
                  <Input id="campaignEndsAt" name="endsAt" type="date" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignCurrencyCode">Currency</Label>
                  <Input id="campaignCurrencyCode" name="currencyCode" defaultValue="USD" maxLength={3} disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignBudgetAmount">Budget</Label>
                  <Input id="campaignBudgetAmount" name="budgetAmount" type="number" min="0" step="0.01" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignSpendAmount">Spend</Label>
                  <Input id="campaignSpendAmount" name="spendAmount" type="number" min="0" step="0.01" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignRevenueAmount">Attributed revenue</Label>
                  <Input id="campaignRevenueAmount" name="revenueAmount" type="number" min="0" step="0.01" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignImpressions">Impressions</Label>
                  <Input id="campaignImpressions" name="impressions" type="number" min="0" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignClicks">Clicks</Label>
                  <Input id="campaignClicks" name="clicks" type="number" min="0" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignWishlists">Wishlists</Label>
                  <Input id="campaignWishlists" name="wishlists" type="number" min="0" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignDemoDownloads">Demo downloads</Label>
                  <Input id="campaignDemoDownloads" name="demoDownloads" type="number" min="0" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignConversions">Conversions</Label>
                  <Input id="campaignConversions" name="conversions" type="number" min="0" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2 lg:col-span-3">
                  <Label htmlFor="campaignNotes">Analysis notes</Label>
                  <Textarea id="campaignNotes" name="notes" placeholder="Audience, creative angle, benchmark, experiment hypothesis, or next action." disabled={!canManage} />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" disabled={!canManage || isSubmitting}>
                    {isSubmitting ? "Saving..." : "Create campaign"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new-order">
          <Card>
            <CardHeader>
              <CardTitle>Register order</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 lg:grid-cols-4" onSubmit={submitOrder}>
                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Order number</Label>
                  <Input id="orderNumber" name="orderNumber" placeholder="SO-1001" disabled={!canManage} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer</Label>
                  <Input id="customerName" name="customerName" placeholder="Publisher, client, or buyer" disabled={!canManage} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Customer email</Label>
                  <Input id="customerEmail" name="customerEmail" type="email" placeholder="buyer@example.com" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="channelId">Channel</Label>
                  <select id="channelId" name="channelId" className={getSelectClassName()} disabled={!canManage}>
                    <option value="">Direct</option>
                    {data.channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>{channel.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectId">Project</Label>
                  <select id="projectId" name="projectId" className={getSelectClassName()} disabled={!canManage}>
                    <option value="">No project</option>
                    {data.projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Order status</Label>
                  <select id="status" name="status" className={getSelectClassName()} defaultValue={CommerceOrderStatus.CONFIRMED} disabled={!canManage}>
                    {orderStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentStatus">Payment</Label>
                  <select id="paymentStatus" name="paymentStatus" className={getSelectClassName()} defaultValue={CommercePaymentStatus.PENDING} disabled={!canManage}>
                    {paymentStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fulfillmentStatus">Fulfillment</Label>
                  <select id="fulfillmentStatus" name="fulfillmentStatus" className={getSelectClassName()} defaultValue={CommerceFulfillmentStatus.PENDING} disabled={!canManage}>
                    {fulfillmentStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currencyCode">Currency</Label>
                  <Input id="currencyCode" name="currencyCode" defaultValue="USD" maxLength={3} disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grossAmount">Gross amount</Label>
                  <Input id="grossAmount" name="grossAmount" type="number" min="0" step="0.01" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="netAmount">Net amount</Label>
                  <Input id="netAmount" name="netAmount" type="number" min="0" step="0.01" defaultValue="0" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" name="quantity" type="number" min="1" defaultValue="1" disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedShipAt">Expected ship</Label>
                  <Input id="expectedShipAt" name="expectedShipAt" type="date" disabled={!canManage} />
                </div>
                <div className="space-y-2 lg:col-span-3">
                  <Label htmlFor="orderNotes">Notes</Label>
                  <Textarea id="orderNotes" name="notes" placeholder="Commercial terms, fulfillment notes, or fiscal handoff." disabled={!canManage} />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" disabled={!canManage || isSubmitting}>
                    {isSubmitting ? "Saving..." : "Create order"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new-channel">
          <Card>
            <CardHeader>
              <CardTitle>Create sales channel</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]" onSubmit={submitChannel}>
                <div className="space-y-2">
                  <Label htmlFor="channelName">Name</Label>
                  <Input id="channelName" name="name" placeholder="Steam, Epic, retail, publisher..." disabled={!canManage} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="channelType">Type</Label>
                  <select id="channelType" name="type" className={getSelectClassName()} defaultValue={CommerceChannelType.DIRECT} disabled={!canManage}>
                    {channelTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="externalCode">External code</Label>
                  <Input id="externalCode" name="externalCode" placeholder="Store id, marketplace id" disabled={!canManage} />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" disabled={!canManage || isSubmitting}>
                    {isSubmitting ? "Saving..." : "Create"}
                  </Button>
                </div>
                <div className="space-y-2 lg:col-span-4">
                  <Label htmlFor="channelNotes">Notes</Label>
                  <Textarea id="channelNotes" name="notes" placeholder="Operational notes, owner, integration status, or fiscal behavior." disabled={!canManage} />
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

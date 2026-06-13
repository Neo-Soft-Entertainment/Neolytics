"use client";

import {
  CommerceChannelType,
  CommerceFulfillmentStatus,
  CommerceOrderStatus,
  CommercePaymentStatus
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
  projects: Array<{
    id: string;
    name: string;
    stage: string;
  }>;
  summary: {
    openOrders: number;
    pendingFulfillment: number;
    paidOrders: number;
    netSalesCents: number;
  };
};

function getField(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getCents(formData: FormData, name: string) {
  const value = Number(getField(formData, name) || "0");
  return Math.round(value * 100);
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

  if (!canAccessCommerceOps) {
    return (
      <div className="space-y-6">
        <PageHero
          title="Commerce"
          description="Manage sales channels, orders, fulfillment, and revenue handoff."
          actions={(
            <>
              <Badge variant="secondary">ERP commerce</Badge>
              <Badge variant="secondary">Plan: {planLabel}</Badge>
            </>
          )}
        />
        <Card>
          <CardContent className="p-5 text-sm">
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-500">Upgrade required</p>
            <p className="mt-2 font-medium">Commerce Operations starts on Plus.</p>
            <p className="mt-2 text-muted-foreground">
              Upgrade to run multichannel orders, fulfillment queues, and sales handoff.
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
        title="Commerce"
        description={`Run channels, orders, payments, and fulfillment for ${organizationName}.`}
        actions={(
          <>
            <Badge variant="secondary">Channels</Badge>
            <Badge variant="secondary">Orders</Badge>
            <Badge variant="secondary">Fulfillment</Badge>
          </>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open orders" value={formatNumber(data.summary.openOrders)} hint="Not fulfilled or canceled" />
        <KpiCard label="Fulfillment queue" value={formatNumber(data.summary.pendingFulfillment)} hint="Picking, shipping, or blocked" />
        <KpiCard label="Paid orders" value={formatNumber(data.summary.paidOrders)} hint="Confirmed cash intake" />
        <KpiCard label="Net sales" value={formatCurrency(data.summary.netSalesCents)} hint="Paid order value" />
      </div>

      {(message || error) ? (
        <div className="rounded-lg border border-white/10 bg-white/55 px-4 py-3 text-sm dark:bg-white/[0.04]">
          {message ? <p className="text-emerald-600">{message}</p> : null}
          {error ? <p className="text-destructive">{error}</p> : null}
        </div>
      ) : null}

      <Tabs defaultValue="orders">
        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-[1rem] border border-white/10 bg-white/55 p-1.5 backdrop-blur dark:bg-white/[0.04]">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="new-order">New order</TabsTrigger>
          <TabsTrigger value="new-channel">New channel</TabsTrigger>
        </TabsList>

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

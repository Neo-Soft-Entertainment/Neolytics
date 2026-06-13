import {
  CommerceChannelType,
  CommerceFulfillmentStatus,
  CommerceOrderStatus,
  CommercePaymentStatus
} from "@prisma/client";

import { createAuditEvent } from "@/lib/audit-service";
import { db } from "@/lib/db";
import { enforceSubscriptionCapability } from "@/lib/subscription-service";

function toNumber(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export async function getCommerceOverview(organizationId: string) {
  const [channels, orders, projects] = await Promise.all([
    db.commerceChannel.findMany({
      where: {
        organizationId
      },
      orderBy: [
        { active: "desc" },
        { createdAt: "desc" }
      ],
      take: 50
    }),
    db.commerceOrder.findMany({
      where: {
        organizationId
      },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 80
    }),
    db.project.findMany({
      where: {
        organizationId
      },
      select: {
        id: true,
        name: true,
        stage: true
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 100
    })
  ]);

  const openOrders = orders.filter((order) => !["FULFILLED", "CANCELED"].includes(order.status)).length;
  const pendingFulfillment = orders.filter((order) =>
    ["PENDING", "PICKING", "READY_TO_SHIP", "BLOCKED"].includes(order.fulfillmentStatus)
  ).length;
  const paidOrders = orders.filter((order) => order.paymentStatus === "PAID").length;
  const netSalesCents = orders.reduce((total, order) => {
    if (order.paymentStatus !== "PAID") {
      return total;
    }

    return total + toNumber(order.netCents);
  }, 0);

  return {
    channels: channels.map((channel) => ({
      ...channel,
      createdAt: channel.createdAt.toISOString(),
      updatedAt: channel.updatedAt.toISOString()
    })),
    orders: orders.map((order) => ({
      ...order,
      grossCents: toNumber(order.grossCents),
      netCents: toNumber(order.netCents),
      expectedShipAt: toIso(order.expectedShipAt),
      fulfilledAt: toIso(order.fulfilledAt),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    })),
    projects,
    summary: {
      openOrders,
      pendingFulfillment,
      paidOrders,
      netSalesCents
    }
  };
}

export async function createCommerceChannel(params: {
  organizationId: string;
  userId: string;
  name: string;
  type: CommerceChannelType;
  externalCode?: string | null;
  notes?: string | null;
}) {
  await enforceSubscriptionCapability(params.organizationId, "commerceOps");

  const channel = await db.commerceChannel.create({
    data: {
      organizationId: params.organizationId,
      name: params.name.trim(),
      type: params.type,
      externalCode: params.externalCode?.trim() || null,
      notes: params.notes?.trim() || null
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "commerce_channel",
    entityId: channel.id,
    action: "created",
    metadata: {
      name: channel.name,
      type: channel.type
    }
  });

  return channel;
}

export async function createCommerceOrder(params: {
  organizationId: string;
  userId: string;
  channelId?: string | null;
  projectId?: string | null;
  orderNumber: string;
  customerName: string;
  customerEmail?: string | null;
  status: CommerceOrderStatus;
  fulfillmentStatus: CommerceFulfillmentStatus;
  paymentStatus: CommercePaymentStatus;
  currencyCode?: string | null;
  grossCents: number;
  netCents: number;
  quantity: number;
  expectedShipAt?: Date | null;
  notes?: string | null;
}) {
  await enforceSubscriptionCapability(params.organizationId, "commerceOps");

  if (params.channelId) {
    const channel = await db.commerceChannel.findFirst({
      where: {
        id: params.channelId,
        organizationId: params.organizationId
      },
      select: {
        id: true
      }
    });

    if (!channel) {
      throw new Error("Commerce channel not found.");
    }
  }

  if (params.projectId) {
    const project = await db.project.findFirst({
      where: {
        id: params.projectId,
        organizationId: params.organizationId
      },
      select: {
        id: true
      }
    });

    if (!project) {
      throw new Error("Project not found.");
    }
  }

  const order = await db.commerceOrder.create({
    data: {
      organizationId: params.organizationId,
      channelId: params.channelId || null,
      projectId: params.projectId || null,
      orderNumber: params.orderNumber.trim(),
      customerName: params.customerName.trim(),
      customerEmail: params.customerEmail?.trim() || null,
      status: params.status,
      fulfillmentStatus: params.fulfillmentStatus,
      paymentStatus: params.paymentStatus,
      currencyCode: params.currencyCode?.trim().toUpperCase() || "USD",
      grossCents: params.grossCents,
      netCents: params.netCents,
      quantity: params.quantity,
      expectedShipAt: params.expectedShipAt ?? null,
      notes: params.notes?.trim() || null,
      createdById: params.userId
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "commerce_order",
    entityId: order.id,
    action: "created",
    metadata: {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus
    }
  });

  return order;
}

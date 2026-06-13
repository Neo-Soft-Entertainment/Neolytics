import {
  CommerceChannelType,
  CommerceFulfillmentStatus,
  CommerceOrderStatus,
  CommercePaymentStatus,
  MarketingCampaignChannel,
  MarketingCampaignObjective,
  MarketingCampaignStatus
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
  const [channels, orders, campaigns, projects] = await Promise.all([
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
    db.marketingCampaign.findMany({
      where: {
        organizationId
      },
      include: {
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
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "ACTIVE").length;
  const marketingSpendCents = campaigns.reduce((total, campaign) => total + toNumber(campaign.spendCents), 0);
  const marketingBudgetCents = campaigns.reduce((total, campaign) => total + toNumber(campaign.budgetCents), 0);
  const attributedRevenueCents = campaigns.reduce((total, campaign) => total + toNumber(campaign.revenueCents), 0);
  const wishlists = campaigns.reduce((total, campaign) => total + campaign.wishlists, 0);
  const demoDownloads = campaigns.reduce((total, campaign) => total + campaign.demoDownloads, 0);
  const campaignConversions = campaigns.reduce((total, campaign) => total + campaign.conversions, 0);
  const campaignClicks = campaigns.reduce((total, campaign) => total + campaign.clicks, 0);
  const channelPerformance = [...new Set(campaigns.map((campaign) => campaign.channel))].map((channel) => {
    const channelCampaigns = campaigns.filter((campaign) => campaign.channel === channel);
    const spendCents = channelCampaigns.reduce((total, campaign) => total + toNumber(campaign.spendCents), 0);
    const revenueCents = channelCampaigns.reduce((total, campaign) => total + toNumber(campaign.revenueCents), 0);
    const impressions = channelCampaigns.reduce((total, campaign) => total + campaign.impressions, 0);
    const clicks = channelCampaigns.reduce((total, campaign) => total + campaign.clicks, 0);
    const channelWishlists = channelCampaigns.reduce((total, campaign) => total + campaign.wishlists, 0);
    const conversions = channelCampaigns.reduce((total, campaign) => total + campaign.conversions, 0);

    return {
      channel,
      campaignsCount: channelCampaigns.length,
      spendCents,
      revenueCents,
      impressions,
      clicks,
      wishlists: channelWishlists,
      demoDownloads: channelCampaigns.reduce((total, campaign) => total + campaign.demoDownloads, 0),
      conversions,
      roas: spendCents > 0 ? revenueCents / spendCents : null,
      clickThroughRate: impressions > 0 ? (clicks / impressions) * 100 : null,
      conversionRate: clicks > 0 ? (conversions / clicks) * 100 : null,
      costPerWishlistCents: channelWishlists > 0 ? Math.round(spendCents / channelWishlists) : null
    };
  }).sort((left, right) => right.revenueCents - left.revenueCents || right.wishlists - left.wishlists);
  const projectSignals = projects.map((project) => {
    const projectOrders = orders.filter((order) => order.projectId === project.id && order.paymentStatus === "PAID");
    const projectCampaigns = campaigns.filter((campaign) => campaign.projectId === project.id);
    const salesCents = projectOrders.reduce((total, order) => total + toNumber(order.netCents), 0);
    const spendCents = projectCampaigns.reduce((total, campaign) => total + toNumber(campaign.spendCents), 0);
    const revenueCents = projectCampaigns.reduce((total, campaign) => total + toNumber(campaign.revenueCents), 0);
    const projectWishlists = projectCampaigns.reduce((total, campaign) => total + campaign.wishlists, 0);
    const projectDemos = projectCampaigns.reduce((total, campaign) => total + campaign.demoDownloads, 0);
    const activeProjectCampaigns = projectCampaigns.filter((campaign) => campaign.status === "ACTIVE").length;
    const readinessScore = Math.min(
      100,
      activeProjectCampaigns * 25 +
      Math.min(projectWishlists, 1000) / 20 +
      Math.min(projectDemos, 500) / 20 +
      (salesCents + revenueCents > 0 ? 15 : 0)
    );

    return {
      project,
      activeCampaigns: activeProjectCampaigns,
      salesCents,
      marketingSpendCents: spendCents,
      attributedRevenueCents: revenueCents,
      wishlists: projectWishlists,
      demoDownloads: projectDemos,
      readinessScore: Math.round(readinessScore),
      roas: spendCents > 0 ? revenueCents / spendCents : null
    };
  }).sort((left, right) => right.readinessScore - left.readinessScore || right.wishlists - left.wishlists);

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
    campaigns: campaigns.map((campaign) => ({
      ...campaign,
      budgetCents: toNumber(campaign.budgetCents),
      spendCents: toNumber(campaign.spendCents),
      revenueCents: toNumber(campaign.revenueCents),
      startsAt: toIso(campaign.startsAt),
      endsAt: toIso(campaign.endsAt),
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString()
    })),
    projects,
    channelPerformance,
    projectSignals,
    summary: {
      openOrders,
      pendingFulfillment,
      paidOrders,
      netSalesCents,
      activeCampaigns,
      marketingSpendCents,
      marketingBudgetCents,
      attributedRevenueCents,
      wishlists,
      demoDownloads,
      campaignConversions,
      roas: marketingSpendCents > 0 ? attributedRevenueCents / marketingSpendCents : null,
      conversionRate: campaignClicks > 0 ? (campaignConversions / campaignClicks) * 100 : null,
      costPerWishlistCents: wishlists > 0 ? Math.round(marketingSpendCents / wishlists) : null,
      commercialRevenueCents: netSalesCents + attributedRevenueCents
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

export async function createMarketingCampaign(params: {
  organizationId: string;
  userId: string;
  projectId?: string | null;
  name: string;
  channel: MarketingCampaignChannel;
  objective: MarketingCampaignObjective;
  status: MarketingCampaignStatus;
  currencyCode?: string | null;
  budgetCents: number;
  spendCents: number;
  impressions: number;
  clicks: number;
  wishlists: number;
  demoDownloads: number;
  conversions: number;
  revenueCents: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  notes?: string | null;
}) {
  await enforceSubscriptionCapability(params.organizationId, "commerceOps");

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

  const campaign = await db.marketingCampaign.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId || null,
      name: params.name.trim(),
      channel: params.channel,
      objective: params.objective,
      status: params.status,
      currencyCode: params.currencyCode?.trim().toUpperCase() || "USD",
      budgetCents: params.budgetCents,
      spendCents: params.spendCents,
      impressions: params.impressions,
      clicks: params.clicks,
      wishlists: params.wishlists,
      demoDownloads: params.demoDownloads,
      conversions: params.conversions,
      revenueCents: params.revenueCents,
      startsAt: params.startsAt ?? null,
      endsAt: params.endsAt ?? null,
      notes: params.notes?.trim() || null,
      createdById: params.userId
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "marketing_campaign",
    entityId: campaign.id,
    action: "created",
    metadata: {
      name: campaign.name,
      channel: campaign.channel,
      objective: campaign.objective
    }
  });

  return campaign;
}

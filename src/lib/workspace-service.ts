import { Prisma, SubscriptionPlan } from "@prisma/client";

import { db } from "@/lib/db";
import { env } from "@/env";
import { notifyOrganizationDiscordWebhook } from "@/lib/discord";
import { generateAiSegmentReportLayer } from "@/lib/market-analysis-ai";
import { buildSegmentIntelligence } from "@/lib/market-intelligence";
import { consumeSubscriptionUsage, enforceSubscriptionCapacity } from "@/lib/subscription-service";

export async function getDefaultWorkspaceForUser(userId: string) {
  return db.workspace.findFirstOrThrow({
    where: {
      organization: {
        members: {
          some: {
            userId
          }
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });
}

export async function saveGameToWorkspace(params: {
  organizationId: string;
  workspaceId: string;
  steamGameId: string;
  userId: string;
}) {
  const existing = await db.savedGame.findUnique({
    where: {
      workspaceId_steamGameId: {
        workspaceId: params.workspaceId,
        steamGameId: params.steamGameId
      }
    }
  });

  if (!existing) {
    await enforceSubscriptionCapacity(params.organizationId, "savedGames");
  }

  return db.savedGame.upsert({
    where: {
      workspaceId_steamGameId: {
        workspaceId: params.workspaceId,
        steamGameId: params.steamGameId
      }
    },
    update: {
      userId: params.userId
    },
    create: {
      workspaceId: params.workspaceId,
      steamGameId: params.steamGameId,
      userId: params.userId
    }
  });
}

export async function createCompetitorSet(params: {
  organizationId: string;
  workspaceId: string;
  createdById: string;
  name: string;
  description?: string;
  appIds: number[];
}) {
  const games = await db.steamGame.findMany({
    where: {
      appId: {
        in: params.appIds
      }
    },
    select: {
      id: true
    }
  });

  await enforceSubscriptionCapacity(params.organizationId, "competitorSets");

  const competitorSet = await db.competitorSet.create({
    data: {
      organizationId: params.organizationId,
      workspaceId: params.workspaceId,
      createdById: params.createdById,
      name: params.name,
      description: params.description,
      games: {
        create: games.map((game) => ({
          steamGameId: game.id
        }))
      }
    },
    include: {
      games: {
        include: {
          steamGame: true
        }
      }
    }
  });

  await notifyOrganizationDiscordWebhook(params.organizationId, {
    content: `Competitor set **${competitorSet.name}** was created in Neolytics.`,
    embeds: [
      {
        title: "Competitor set created",
        description: `${competitorSet.name} now tracks ${games.length} Steam games.`,
        color: 3447003,
        timestamp: new Date().toISOString()
      }
    ]
  });

  return competitorSet;
}

export async function generateBasicMarketReport(params: {
  organizationId: string;
  workspaceId: string;
  createdById: string;
  title: string;
  genre?: string;
  tag?: string;
}) {
  const organization = await db.organization.findUniqueOrThrow({
    where: {
      id: params.organizationId
    },
    select: {
      subscriptionPlan: true
    }
  });
  const isProPlan = organization.subscriptionPlan === SubscriptionPlan.PRO;
  const topGames = await db.steamGame.findMany({
    where: {
      ...(params.genre
        ? {
            genres: {
              some: {
                steamGenre: {
                  slug: params.genre
                }
              }
            }
          }
        : {}),
      ...(params.tag
        ? {
            tags: {
              some: {
                steamTag: {
                  slug: params.tag
                }
              }
            }
          }
        : {})
    },
    include: {
      priceCurrent: true,
      revenueEstimates: {
        orderBy: {
          calculatedAt: "desc"
        },
        take: 1
      },
      genres: {
        include: {
          steamGenre: true
        }
      },
      tags: {
        include: {
          steamTag: true
        }
      }
    },
    take: 40
  });
  const segment = buildSegmentIntelligence(topGames);
  const leaders = [...topGames]
    .sort((left, right) => Number(right.revenueEstimates[0]?.medianNetRevenueCents ?? 0n) - Number(left.revenueEstimates[0]?.medianNetRevenueCents ?? 0n))
    .slice(0, 10);
  const aiNarrative = await generateAiSegmentReportLayer({
    title: params.title,
    genre: params.genre,
    tag: params.tag,
    segment,
    leaders: leaders.map((game) => ({
      name: game.name,
      priceCents: game.priceCurrent?.finalPriceCents ?? null,
      reviewScore: game.reviewScore,
      reviewCount: game.reviewCount,
      medianRevenueCents: Number(game.revenueEstimates[0]?.medianNetRevenueCents ?? 0n),
      genres: game.genres.map((genre) => genre.steamGenre.name),
      tags: game.tags.map((tag) => tag.steamTag.name)
    }))
  });
  const operatingBrief = isProPlan
    ? {
        boardDirective:
          segment.opportunityScore >= 70
            ? "Treat this as a board-level growth bet, but attach tighter launch checkpoints and a stronger production readiness review."
            : "Treat this as a controlled thesis. Push for sharper positioning before committing major production budget.",
        commercialDirective:
          segment.revenueConcentrationPercent >= 65
            ? "Commercial planning should assume a winner-takes-most shelf, so messaging, capsule quality, and launch timing must be sharper than the median segment entry."
            : "Commercial planning can support a mid-tier outcome, so the team can win through focus, clarity, and disciplined pricing rather than blockbuster scope.",
        operatingDirective:
          segment.executionBarScore >= 70
            ? "Finance, approvals, and milestone governance should be in place before the production plan scales."
            : "The operating burden is moderate enough to support a leaner studio setup while the thesis is still being proven."
      }
    : null;

  const content = [
    `# ${params.title}`,
    "",
    "## Summary",
    `This report summarizes ${topGames.length} matched Steam games${params.genre ? ` in the ${params.genre} segment` : ""}${params.tag ? ` tagged with ${params.tag}` : ""}.`,
    "",
    "## Market Depth",
    `- Segment size: ${segment.segmentSize} tracked games`,
    `- Market size: ${segment.marketSizeLabel} (${(segment.marketSizeCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })})`,
    `- Median revenue: ${(segment.medianRevenueCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`,
    `- P75 revenue: ${(segment.p75RevenueCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`,
    `- Avg review score: ${segment.averageReviewScore.toFixed(1)}%`,
    `- Launch cohorts: ${segment.launches90} in 90d, ${segment.launches180} in 180d, ${segment.launches365} in 365d`,
    "",
    "## Competition Layer",
    `- Crowdedness score: ${segment.crowdednessScore}`,
    `- Revenue concentration: ${segment.revenueConcentrationPercent}% in the top 3 revenue leaders`,
    `- Quality bar: ${segment.qualityBarScore}`,
    `- Premium share: ${segment.premiumSharePercent}%`,
    "",
    "## Opportunity Layer",
    `- Opportunity score: ${segment.opportunityScore}`,
    `- Revenue potential: ${segment.revenuePotentialScore}`,
    `- Underserved score: ${segment.underservedScore}`,
    `- Execution bar: ${segment.executionBarScore}`,
    `- Risk score: ${segment.riskScore}`,
    `- Confidence: ${segment.confidenceLabel} (${segment.confidenceScore})`,
    "",
    "## Strategic Read",
    segment.opportunityScore >= 70
      ? "This segment shows strong upside and the data suggests room for a sharp entrant, but the team still has to clear a meaningful execution bar."
      : "This segment is viable, but the data suggests the edge has to come from positioning and execution rather than from a structurally open market.",
    segment.revenueConcentrationPercent >= 65
      ? "Revenue is concentrated in a few leaders, so beating the winners on shelf clarity and quality is more important than simply matching the average feature set."
      : "Revenue is relatively spread across the segment, which means there is a healthier path for mid-tier entrants to carve out a business.",
    ...(aiNarrative
      ? [
          "",
          "## AI Strategic Read",
          aiNarrative.executiveSummary,
          "",
          "### Demand drivers",
          aiNarrative.demandDrivers,
          "",
          "### Saturation",
          aiNarrative.saturationRead,
          "",
          "### Pricing",
          aiNarrative.pricingRead,
          "",
          "### Launch window",
          aiNarrative.launchWindowAdvice,
          "",
          "### Monetization",
          aiNarrative.monetizationRead,
          "",
          "### Confidence",
          aiNarrative.confidenceNarrative,
          "",
          "### Recommended next moves",
          ...aiNarrative.actionItems.map((item) => `- ${item}`)
        ]
      : []),
    ...(operatingBrief
      ? [
          "",
          "## Pro Operating Brief",
          operatingBrief.boardDirective,
          "",
          "### Commercial directive",
          operatingBrief.commercialDirective,
          "",
          "### Operating directive",
          operatingBrief.operatingDirective
        ]
      : []),
    "",
    "## Price Distribution",
    `- Under $10: ${segment.priceBandDistribution.under10}`,
    `- $10-$20: ${segment.priceBandDistribution.between10And20}`,
    `- $20-$30: ${segment.priceBandDistribution.between20And30}`,
    `- $30+: ${segment.priceBandDistribution.over30}`,
    "",
    "## Top estimated net revenue titles",
    ...leaders.map((game, index) => {
      const revenue = Number(game.revenueEstimates[0]?.medianNetRevenueCents ?? 0n);
      return `${index + 1}. ${game.name} - estimated net revenue ${(revenue / 100).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
      })}`;
    })
  ].join("\n");
  const reportMetadata = {
    genre: params.genre,
    tag: params.tag,
    generatedAt: new Date().toISOString(),
    segment,
    aiNarrative,
    operatingBrief,
    planLabel: organization.subscriptionPlan
  } as unknown as Prisma.InputJsonObject;

  const report = await db.$transaction(async (tx) => {
    await consumeSubscriptionUsage(params.organizationId, "reportsGenerated", tx);

    return tx.aiReport.create({
      data: {
        organizationId: params.organizationId,
        workspaceId: params.workspaceId,
        createdById: params.createdById,
        reportType: "MARKET",
        status: "READY",
        title: params.title,
        subject: params.genre ?? params.tag ?? "steam-market",
        content,
        metadata: reportMetadata
      }
    });
  });

  await notifyOrganizationDiscordWebhook(params.organizationId, {
    content: `Market report **${report.title}** is ready in Neolytics.`,
    embeds: [
      {
        title: "Market report generated",
        description: `Open ${env.AUTH_URL}/reports to review **${report.title}**.`,
        color: 10181046,
        timestamp: new Date().toISOString()
      }
    ]
  });

  return report;
}

import { Prisma, SubscriptionPlan } from "@prisma/client";

import { db } from "@/lib/db";
import { getFinanceOverview } from "@/lib/finance-service";
import { buildGameOpportunityProfile, buildSegmentIntelligence } from "@/lib/market-intelligence";
import {
  canAccessSteamXrayPlayerHistory,
  getSteamXrayHistoryLimit,
  hasSubscriptionCapability
} from "@/lib/subscription-plans";
import { formatCurrency, formatNumber } from "@/lib/utils";

function revenueToNumber(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function median(values: number[]) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((left, right) => left - right);

  if (sorted.length === 0) {
    return 0;
  }

  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function getObservedVelocity<T extends { snapshotDate: Date }>(
  snapshots: T[],
  field: keyof T,
  windowDays: number
) {
  const latest = snapshots[snapshots.length - 1];

  if (!latest) {
    return null;
  }

  const threshold = daysAgo(windowDays);
  const baseline = snapshots.find((snapshot) => snapshot.snapshotDate >= threshold) ?? snapshots[0];
  const latestValue = Number(latest[field] ?? 0);
  const baselineValue = Number(baseline[field] ?? 0);

  return {
    current: latestValue,
    baseline: baselineValue,
    absoluteChange: latestValue - baselineValue,
    relativeChangePercent: baselineValue > 0 ? Math.round(((latestValue - baselineValue) / baselineValue) * 100) : null,
    windowDays
  };
}

const gameInclude = {
  priceCurrent: true,
  tags: {
    include: {
      steamTag: true
    }
  },
  genres: {
    include: {
      steamGenre: true
    }
  },
  developers: {
    include: {
      steamDeveloper: true
    }
  },
  publishers: {
    include: {
      steamPublisher: true
    }
  }
} satisfies Prisma.SteamGameInclude;

export async function searchGames(input: {
  query?: string;
  genre?: string;
  tag?: string;
  minPrice?: number;
  maxPrice?: number;
  minReviewScore?: number;
  fromReleaseDate?: Date;
  toReleaseDate?: Date;
  page?: number;
  pageSize?: number;
}) {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 25;

  const where: Prisma.SteamGameWhereInput = {
    ...(input.query
      ? {
          OR: [
            {
              name: {
                contains: input.query,
                mode: "insensitive"
              }
            },
            {
              shortDescription: {
                contains: input.query,
                mode: "insensitive"
              }
            }
          ]
        }
      : {}),
    ...(input.genre
      ? {
          genres: {
            some: {
              steamGenre: {
                slug: input.genre
              }
            }
          }
        }
      : {}),
    ...(input.tag
      ? {
          tags: {
            some: {
              steamTag: {
                slug: input.tag
              }
            }
          }
        }
      : {}),
    ...(input.minReviewScore !== undefined
      ? {
          reviewScore: {
            gte: input.minReviewScore
          }
        }
      : {}),
    ...(input.fromReleaseDate || input.toReleaseDate
      ? {
          releaseDate: {
            ...(input.fromReleaseDate ? { gte: input.fromReleaseDate } : {}),
            ...(input.toReleaseDate ? { lte: input.toReleaseDate } : {})
          }
        }
      : {}),
    ...(input.minPrice !== undefined || input.maxPrice !== undefined
      ? {
          priceCurrent: {
            is: {
              finalPriceCents: {
                ...(input.minPrice !== undefined ? { gte: input.minPrice } : {}),
                ...(input.maxPrice !== undefined ? { lte: input.maxPrice } : {})
              }
            }
          }
        }
      : {})
  };

  const [items, total] = await Promise.all([
    db.steamGame.findMany({
      where,
      include: gameInclude,
      orderBy: [{ reviewCount: "desc" }, { appId: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    db.steamGame.count({ where })
  ]);

  return {
    items,
    total,
    page,
    pageSize
  };
}

export async function getGameByAppId(appId: number) {
  return db.steamGame.findUnique({
    where: {
      appId
    },
    include: {
      ...gameInclude,
      salesEstimates: {
        orderBy: {
          calculatedAt: "desc"
        },
        take: 1
      },
      revenueEstimates: {
        orderBy: {
          calculatedAt: "desc"
        },
        take: 1
      }
    }
  });
}

export function getSteamXrayAccess(plan: SubscriptionPlan) {
  return {
    label:
      plan === "FREE"
        ? "Basic access"
        : plan === "PLUS"
          ? "Advanced access"
          : "Unlimited",
    historyLimit: getSteamXrayHistoryLimit(plan),
    playerHistoryAvailable: canAccessSteamXrayPlayerHistory(plan),
    rawSnapshotsBetaAvailable: hasSubscriptionCapability(plan, "earlyAccess")
  };
}

export async function getGameSnapshots(appId: number, limit = 90) {
  const game = await db.steamGame.findUniqueOrThrow({
    where: {
      appId
    },
    select: {
      id: true
    }
  });

  return db.steamGameSnapshot.findMany({
    where: {
      steamGameId: game.id
    },
    orderBy: {
      snapshotDate: "desc"
    },
    take: limit
  });
}

export async function getPriceHistory(appId: number, limit = 180) {
  const game = await db.steamGame.findUniqueOrThrow({
    where: {
      appId
    },
    select: {
      id: true
    }
  });

  return db.steamPriceSnapshot.findMany({
    where: {
      steamGameId: game.id
    },
    orderBy: {
      snapshotDate: "asc"
    },
    take: limit
  });
}

export async function getReviewHistory(appId: number, limit = 180) {
  const game = await db.steamGame.findUniqueOrThrow({
    where: {
      appId
    },
    select: {
      id: true
    }
  });

  return db.steamReviewSnapshot.findMany({
    where: {
      steamGameId: game.id
    },
    orderBy: {
      snapshotDate: "asc"
    },
    take: limit
  });
}

export async function getPlayerHistory(appId: number, limit = 180) {
  const game = await db.steamGame.findUniqueOrThrow({
    where: {
      appId
    },
    select: {
      id: true
    }
  });

  return db.steamPlayerCountSnapshot.findMany({
    where: {
      steamGameId: game.id
    },
    orderBy: {
      snapshotDate: "asc"
    },
    take: limit
  });
}

export async function getLatestEstimates(appId: number) {
  const game = await db.steamGame.findUniqueOrThrow({
    where: {
      appId
    },
    include: {
      salesEstimates: {
        orderBy: {
          calculatedAt: "desc"
        },
        take: 1
      },
      revenueEstimates: {
        orderBy: {
          calculatedAt: "desc"
        },
        take: 1
      }
    }
  });

  return {
    salesEstimate: game.salesEstimates[0] ?? null,
    revenueEstimate: game.revenueEstimates[0] ?? null
  };
}

export async function getSteamDatabaseProfile(appId: number) {
  const game = await db.steamGame.findUniqueOrThrow({
    where: {
      appId
    },
    include: {
      ...gameInclude,
      salesEstimates: {
        orderBy: {
          calculatedAt: "desc"
        },
        take: 1
      },
      revenueEstimates: {
        orderBy: {
          calculatedAt: "desc"
        },
        take: 1
      },
      priceSnapshots: {
        orderBy: {
          snapshotDate: "desc"
        },
        take: 180
      },
      reviewSnapshots: {
        orderBy: {
          snapshotDate: "desc"
        },
        take: 180
      },
      playerSnapshots: {
        orderBy: {
          snapshotDate: "desc"
        },
        take: 180
      }
    }
  });

  const genreIds = game.genres.map((genre) => genre.steamGenreId);
  const tagIds = game.tags.map((tag) => tag.steamTagId);
  const peerRules: Prisma.SteamGameWhereInput[] = [];

  if (genreIds.length > 0) {
    peerRules.push({
      genres: {
        some: {
          steamGenreId: {
            in: genreIds
          }
        }
      }
    });
  }

  if (tagIds.length > 0) {
    peerRules.push({
      tags: {
        some: {
          steamTagId: {
            in: tagIds
          }
        }
      }
    });
  }

  const peers = await db.steamGame.findMany({
    where: {
      id: {
        not: game.id
      },
      ...(peerRules.length > 0 ? { OR: peerRules } : {})
    },
    include: {
      priceCurrent: true,
      tags: {
        include: {
          steamTag: true
        }
      },
      genres: {
        include: {
          steamGenre: true
        }
      },
      revenueEstimates: {
        orderBy: {
          calculatedAt: "desc"
        },
        take: 1
      }
    },
    orderBy: [{ reviewCount: "desc" }, { appId: "asc" }],
    take: 500
  });

  const now = new Date();
  const oneYearAgo = daysAgo(365);
  const twoYearsAgo = daysAgo(730);
  const priceSnapshots = [...game.priceSnapshots].reverse();
  const reviewSnapshots = [...game.reviewSnapshots].reverse();
  const playerSnapshots = [...game.playerSnapshots].reverse();
  const peerPrices = peers.map((peer) => peer.priceCurrent?.finalPriceCents ?? 0).filter((price) => price > 0);
  const peerReviewCounts = peers.map((peer) => peer.reviewCount ?? 0);
  const peerRevenues = peers.map((peer) => revenueToNumber(peer.revenueEstimates[0]?.medianNetRevenueCents)).filter((revenue) => revenue > 0);
  const currentPrice = game.priceCurrent?.finalPriceCents ?? 0;
  const medianPeerPrice = median(peerPrices);
  const medianPeerReviews = median(peerReviewCounts);
  const medianPeerRevenue = median(peerRevenues);
  const gameMedianRevenue = revenueToNumber(game.revenueEstimates[0]?.medianNetRevenueCents);
  const reviewVelocity30 = getObservedVelocity(reviewSnapshots, "totalReviews", 30);
  const playerVelocity30 = getObservedVelocity(playerSnapshots, "currentPlayers", 30);
  const recentPeers = peers.filter((peer) => peer.releaseDate && peer.releaseDate >= oneYearAgo);
  const previousYearPeers = peers.filter((peer) => peer.releaseDate && peer.releaseDate >= twoYearsAgo && peer.releaseDate < oneYearAgo);
  const growthRatio = previousYearPeers.length > 0 ? recentPeers.length / previousYearPeers.length : recentPeers.length > 0 ? 1 : 0;
  const priceCompatibilityScore = currentPrice === 0 || medianPeerPrice === 0
    ? 65
    : clampScore(100 - Math.abs(currentPrice - medianPeerPrice) / medianPeerPrice * 100);
  const demandScore = clampScore(Math.log10((game.reviewCount ?? 0) + 1) * 22);
  const competitionScore = clampScore(100 - Math.min(85, peers.length / 4));
  const growthScore = clampScore(
    (growthRatio >= 1 ? 55 + Math.min(35, (growthRatio - 1) * 35) : 45 * growthRatio)
    + Math.min(15, Math.max(0, reviewVelocity30?.relativeChangePercent ?? 0) / 2)
  );
  const sentimentScore = clampScore(game.reviewScore ?? 50);
  const historicalPerformanceScore = medianPeerRevenue > 0
    ? clampScore(Math.log10(gameMedianRevenue + 1) / Math.log10(medianPeerRevenue * 4 + 1) * 100)
    : demandScore;
  const opportunityScore = clampScore(
    demandScore * 0.24
    + competitionScore * 0.18
    + growthScore * 0.16
    + priceCompatibilityScore * 0.14
    + sentimentScore * 0.14
    + historicalPerformanceScore * 0.14
  );
  const dataQualityFactors = [
    game.lastIngestedAt !== null,
    priceSnapshots.length > 0,
    reviewSnapshots.length > 0,
    playerSnapshots.length > 0,
    game.salesEstimates.length > 0,
    peers.length >= 10
  ];
  const dataQualityScore = clampScore((dataQualityFactors.filter(Boolean).length / dataQualityFactors.length) * 100);
  const directCompetitors = peers
    .filter((peer) =>
      peer.genres.some((genre) => genreIds.includes(genre.steamGenreId))
      && peer.tags.some((tag) => tagIds.includes(tag.steamTagId))
    )
    .slice(0, 8);
  const adjacentCompetitors = peers
    .filter((peer) => !directCompetitors.some((competitor) => competitor.id === peer.id))
    .slice(0, 8);
  const recentSuccessfulLaunches = recentPeers
    .filter((peer) => (peer.reviewCount ?? 0) >= Math.max(50, medianPeerReviews) && (peer.reviewScore ?? 0) >= 78)
    .slice(0, 6);
  const weakSimilarLaunches = recentPeers
    .filter((peer) => (peer.reviewCount ?? 0) < Math.max(50, medianPeerReviews * 0.35) || (peer.reviewScore ?? 100) < 65)
    .slice(0, 6);
  const topTags = new Map<string, { name: string; total: number; recent: number }>();

  for (const peer of peers) {
    for (const tag of peer.tags) {
      const current = topTags.get(tag.steamTag.slug) ?? { name: tag.steamTag.name, total: 0, recent: 0 };
      current.total += 1;

      if (peer.releaseDate && peer.releaseDate >= oneYearAgo) {
        current.recent += 1;
      }

      topTags.set(tag.steamTag.slug, current);
    }
  }

  const emergingTags = Array.from(topTags.values())
    .map((tag) => ({
      name: tag.name,
      recentSharePercent: recentPeers.length > 0 ? Math.round((tag.recent / recentPeers.length) * 100) : 0,
      datasetSharePercent: peers.length > 0 ? Math.round((tag.total / peers.length) * 100) : 0
    }))
    .filter((tag) => tag.recentSharePercent > tag.datasetSharePercent && tag.recentSharePercent >= 10)
    .sort((left, right) => right.recentSharePercent - left.recentSharePercent)
    .slice(0, 6);
  const observedPrices = priceSnapshots.map((snapshot) => snapshot.finalPriceCents ?? 0).filter((price) => price > 0);
  const observedPlayers = playerSnapshots.map((snapshot) => snapshot.currentPlayers).filter((players) => players > 0);

  return {
    appId: game.appId,
    name: game.name,
    generatedAt: now.toISOString(),
    classification:
      opportunityScore >= 75
        ? "High probability opportunity"
        : opportunityScore >= 58
          ? "Medium confidence market"
          : peers.length > 120
            ? "Oversaturated segment"
            : "Low evidence opportunity",
    opportunityScore,
    confidenceLevel: dataQualityScore >= 75 ? "High" : dataQualityScore >= 50 ? "Medium" : "Low",
    dataQuality: {
      score: dataQualityScore,
      priceSnapshots: priceSnapshots.length,
      reviewSnapshots: reviewSnapshots.length,
      playerSnapshots: playerSnapshots.length,
      peerDatasetSize: peers.length,
      lastIngestedAt: game.lastIngestedAt
    },
    weightedFactors: [
      { name: "Demand", score: demandScore, weight: 24, evidence: `${formatNumber(game.reviewCount)} reviews vs ${formatNumber(medianPeerReviews)} peer median.` },
      { name: "Competition", score: competitionScore, weight: 18, evidence: `${formatNumber(peers.length)} similar games in the current Neolytics Steam Database slice.` },
      { name: "Growth trend", score: growthScore, weight: 16, evidence: `${formatNumber(recentPeers.length)} similar launches in the last 12 months vs ${formatNumber(previousYearPeers.length)} in the prior year.` },
      { name: "Pricing compatibility", score: priceCompatibilityScore, weight: 14, evidence: `${formatCurrency(currentPrice)} current price vs ${formatCurrency(medianPeerPrice)} peer median.` },
      { name: "User sentiment", score: sentimentScore, weight: 14, evidence: `${game.reviewScore ? `${game.reviewScore.toFixed(1)}%` : "N/A"} review score.` },
      { name: "Historical performance", score: historicalPerformanceScore, weight: 14, evidence: `${game.revenueEstimates.length > 0 ? formatCurrency(gameMedianRevenue) : "N/A"} estimated median net revenue.` }
    ],
    marketSignals: {
      demandScore,
      competitionScore,
      growthScore,
      sentimentScore,
      genreSaturation: peers.length >= 160 ? "High" : peers.length >= 60 ? "Medium" : "Low",
      growthRatio: Number(growthRatio.toFixed(2)),
      reviewVelocity30,
      playerVelocity30
    },
    observedHistory: {
      price: {
        currentPriceCents: currentPrice,
        lowestObservedPriceCents: observedPrices.length > 0 ? Math.min(...observedPrices) : null,
        highestObservedPriceCents: observedPrices.length > 0 ? Math.max(...observedPrices) : null,
        discountSnapshotCount: priceSnapshots.filter((snapshot) => (snapshot.discountPercent ?? 0) > 0).length
      },
      players: {
        currentPlayers: game.currentPlayers,
        peakObservedPlayers: observedPlayers.length > 0 ? Math.max(...observedPlayers) : null,
        averageObservedPlayers: observedPlayers.length > 0 ? Math.round(observedPlayers.reduce((sum, value) => sum + value, 0) / observedPlayers.length) : null
      },
      reviews: {
        totalReviews: game.reviewCount,
        reviewScore: game.reviewScore,
        reviewScoreLabel: game.reviewScoreLabel
      }
    },
    competitiveIntelligence: {
      directCompetitors: directCompetitors.map((peer) => ({
        appId: peer.appId,
        name: peer.name,
        reviewCount: peer.reviewCount,
        reviewScore: peer.reviewScore,
        estimatedMedianNetRevenueCents: peer.revenueEstimates[0]?.medianNetRevenueCents ?? null
      })),
      adjacentCompetitors: adjacentCompetitors.map((peer) => ({
        appId: peer.appId,
        name: peer.name,
        reviewCount: peer.reviewCount,
        reviewScore: peer.reviewScore,
        estimatedMedianNetRevenueCents: peer.revenueEstimates[0]?.medianNetRevenueCents ?? null
      })),
      recentSuccessfulLaunches: recentSuccessfulLaunches.map((peer) => ({
        appId: peer.appId,
        name: peer.name,
        releaseDate: peer.releaseDate,
        reviewCount: peer.reviewCount,
        reviewScore: peer.reviewScore
      })),
      weakSimilarLaunches: weakSimilarLaunches.map((peer) => ({
        appId: peer.appId,
        name: peer.name,
        releaseDate: peer.releaseDate,
        reviewCount: peer.reviewCount,
        reviewScore: peer.reviewScore
      }))
    },
    trendDetection: {
      releaseMomentum: growthRatio >= 1.25 ? "Rising" : growthRatio <= 0.75 ? "Cooling" : "Stable",
      explanation:
        growthRatio >= 1.25
          ? "Similar Steam releases are appearing faster than the prior-year cohort, which usually indicates stronger category attention and higher discoverability competition."
          : growthRatio <= 0.75
            ? "The comparable release cadence is lower than the prior-year cohort, which can mean category cooling or a less crowded release window."
            : "Comparable release cadence is broadly stable against the prior-year cohort.",
      emergingTags
    },
    sources: [
      "Steam Web API app catalog",
      "Steam Store appdetails metadata",
      "Steam public review summary",
      "Steam current player endpoint",
      "Neolytics internal price, review, player, sales, and revenue snapshots"
    ],
    evidenceTrail: [
      "No SteamDB API or SteamDB scraping is used.",
      "Competitors are selected from overlapping Steam genres and tags in the Neolytics database.",
      "Opportunity score is deterministic and remains available without an AI provider.",
      "Confidence is based on snapshot coverage, estimate coverage, and peer dataset size."
    ]
  };
}

export async function compareGames(appIds: number[]) {
  return db.steamGame.findMany({
    where: {
      appId: {
        in: appIds
      }
    },
    include: {
      ...gameInclude,
      salesEstimates: {
        orderBy: {
          calculatedAt: "desc"
        },
        take: 1
      },
      revenueEstimates: {
        orderBy: {
          calculatedAt: "desc"
        },
        take: 1
      }
    }
  });
}

export async function getDashboardData(workspaceId: string) {
  const workspace = await db.workspace.findUniqueOrThrow({
    where: {
      id: workspaceId
    },
    select: {
      organizationId: true,
      organization: {
        select: {
          subscriptionPlan: true
        }
      }
    }
  });
  const subscriptionPlan = workspace.organization.subscriptionPlan;

  const [
    trackedGames,
    recentLaunches,
    topRevenueGames,
    fastestGrowing
  ] = await Promise.all([
    db.savedGame.findMany({
      where: { workspaceId },
      include: {
        steamGame: {
          include: {
            priceCurrent: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 10
    }),
    db.steamGame.findMany({
      where: {
        releaseDate: {
          not: null
        }
      },
      orderBy: {
        releaseDate: "desc"
      },
      take: 10,
      include: {
        priceCurrent: true
      }
    }),
    db.steamGame.findMany({
      where: {
        revenueEstimates: {
          some: {}
        }
      },
      include: {
        priceCurrent: true,
        revenueEstimates: {
          orderBy: {
            calculatedAt: "desc"
          },
          take: 1
        }
      },
      take: 100
    }),
    db.steamGame.findMany({
      where: {
        reviewCount: {
          gt: 0
        }
      },
      orderBy: {
        reviewCount: "desc"
      },
      take: 10,
      include: {
        priceCurrent: true
      }
    })
  ]);

  const [
    competitorSetsCount,
    projectsCount,
    analyzedProjectsCount,
    gddsCount,
    reportsCount,
    projectAnalyses
  ] = await Promise.all([
    db.competitorSet.count({
      where: {
        workspaceId
      }
    }),
    db.project.count({
      where: {
        workspaceId
      }
    }),
    db.projectAnalysis.count({
      where: {
        project: {
          workspaceId
        }
      }
    }),
    db.projectGdd.count({
      where: {
        project: {
          workspaceId
        }
      }
    }),
    db.aiReport.count({
      where: {
        workspaceId
      }
    }),
    db.projectAnalysis.findMany({
      where: {
        project: {
          workspaceId
        }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            stage: true
          }
        }
      },
      orderBy: {
        analyzedAt: "desc"
      },
      take: 12
    })
  ]);

  const [
    budgetsCount,
    communityPostsCount,
    legalEntitiesCount,
    companyDocumentsCount
  ] = await Promise.all([
    db.budget.count({
      where: {
        organizationId: workspace.organizationId
      }
    }),
    db.communityPost.count({
      where: {
        organizationId: workspace.organizationId
      }
    }),
    db.legalEntity.count({
      where: {
        organizationId: workspace.organizationId
      }
    }),
    db.companyDocument.count({
      where: {
        legalEntity: {
          organizationId: workspace.organizationId
        }
      }
    })
  ]);
  const financeOverview = await getFinanceOverview(workspace.organizationId);
  const topRevenue = topRevenueGames
    .flatMap((game) => {
      const estimate = game.revenueEstimates[0];

      if (!estimate) {
        return [];
      }

      return [{
        id: estimate.id,
        medianNetRevenueCents: revenueToNumber(estimate.medianNetRevenueCents),
        steamGame: {
          id: game.id,
          appId: game.appId,
          name: game.name
        }
      }];
    })
    .sort((a, b) => b.medianNetRevenueCents - a.medianNetRevenueCents)
    .slice(0, 10);

  const totals = await db.steamGame.aggregate({
    _count: {
      _all: true
    },
    _avg: {
      reviewScore: true
    }
  });

  const guidedJourneySteps = [
    {
      id: "save-game",
      title: "Build your first shortlist",
      description: "Save at least one Steam game into the current workspace.",
      href: "/games",
      completed: trackedGames.length > 0
    },
    {
      id: "competitor-set",
      title: "Create a competitor set",
      description: "Bundle a group of Steam comps you want to monitor together.",
      href: "/compare",
      completed: competitorSetsCount > 0
    },
    {
      id: "project",
      title: "Open a project thesis",
      description: "Turn a game idea into a working concept inside Game Board.",
      href: "/projects",
      completed: projectsCount > 0
    },
    {
      id: "analysis",
      title: "Run market analysis",
      description: "Generate the first viability pass for one project.",
      href: "/projects",
      completed: analyzedProjectsCount > 0
    },
    {
      id: "gdd",
      title: "Generate a GDD",
      description: "Create the first automated GDD from your project data.",
      href: "/projects",
      completed: gddsCount > 0
    }
  ];

  if (hasSubscriptionCapability(subscriptionPlan, "communityFeed")) {
    guidedJourneySteps.push({
      id: "community",
      title: "Publish a community signal",
      description: "Turn one market or project insight into shared studio memory.",
      href: "/community",
      completed: communityPostsCount > 0
    });
  }

  if (hasSubscriptionCapability(subscriptionPlan, "financeWorkspace")) {
    guidedJourneySteps.push({
      id: "finance",
      title: "Open the finance layer",
      description: "Create the first budget or commercial entry for the studio.",
      href: "/finance",
      completed: budgetsCount > 0 || financeOverview.revenueEntries.length > 0 || financeOverview.expenseEntries.length > 0
    });
  }

  if (hasSubscriptionCapability(subscriptionPlan, "companyHub")) {
    guidedJourneySteps.push({
      id: "company",
      title: "Set up your company hub",
      description: "Register the legal entity that will own operations and reporting.",
      href: "/company",
      completed: legalEntitiesCount > 0
    });
  }

  if (hasSubscriptionCapability(subscriptionPlan, "documentVault")) {
    guidedJourneySteps.push({
      id: "documents",
      title: "Upload operating documents",
      description: "Start the document vault with at least one corporate file.",
      href: "/company",
      completed: companyDocumentsCount > 0
    });
  }

  if (hasSubscriptionCapability(subscriptionPlan, "contractsRoyalties")) {
    guidedJourneySteps.push({
      id: "contracts",
      title: "Create a contract or royalty record",
      description: "Move from planning into commercial operations.",
      href: "/finance",
      completed: financeOverview.contracts.length > 0 || financeOverview.royaltyAgreements.length > 0
    });
  }

  if (hasSubscriptionCapability(subscriptionPlan, "invoiceOps")) {
    guidedJourneySteps.push({
      id: "payables",
      title: "Register your first payable",
      description: "Start the real accounts payable trail for the studio.",
      href: "/finance",
      completed: financeOverview.payableTitles.length > 0 || financeOverview.issuedInvoices.length > 0 || financeOverview.receivedInvoices.length > 0
    });
  }

  if (hasSubscriptionCapability(subscriptionPlan, "approvalsAudit")) {
    guidedJourneySteps.push({
      id: "approvals",
      title: "Clear the first approval flow",
      description: "Run at least one finance approval to activate governance.",
      href: "/finance",
      completed: financeOverview.approvalRequests.length > 0
    });
  }

  guidedJourneySteps.push({
    id: "report",
    title: "Export a market report",
    description: "Generate a report and share it with your team.",
    href: "/reports",
    completed: reportsCount > 0
  });

  const completedJourneySteps = guidedJourneySteps.filter((step) => step.completed).length;
  const thesisSignals = projectAnalyses.map((analysis) => {
    const metadata = (analysis.metadata ?? {}) as {
      opportunityLayer?: {
        opportunityScore: number;
        riskScore: number;
      };
      projectFitLayer?: {
        overallFitScore: number;
      };
      marketDepth?: {
        confidenceScore: number;
      };
    };

    return {
      projectId: analysis.project.id,
      projectName: analysis.project.name,
      stage: analysis.project.stage,
      opportunityScore: metadata.opportunityLayer?.opportunityScore ?? null,
      riskScore: metadata.opportunityLayer?.riskScore ?? null,
      fitScore: metadata.projectFitLayer?.overallFitScore ?? null,
      confidenceScore: metadata.marketDepth?.confidenceScore ?? null
    };
  });
  const scoredSignals = thesisSignals.filter((item) => item.opportunityScore !== null);
  const portfolioReadiness = scoredSignals.length > 0
    ? {
        averageOpportunityScore: Math.round(scoredSignals.reduce((sum, item) => sum + (item.opportunityScore ?? 0), 0) / scoredSignals.length),
        averageRiskScore: Math.round(scoredSignals.reduce((sum, item) => sum + (item.riskScore ?? 0), 0) / scoredSignals.length),
        averageFitScore: Math.round(scoredSignals.reduce((sum, item) => sum + (item.fitScore ?? 0), 0) / scoredSignals.length),
        topThesis: [...scoredSignals].sort((left, right) => (right.opportunityScore ?? 0) - (left.opportunityScore ?? 0))[0] ?? null
      }
    : null;

  return {
    planLabel:
      subscriptionPlan === SubscriptionPlan.FREE
        ? "Explorer"
        : subscriptionPlan === SubscriptionPlan.PLUS
          ? "Operating"
          : "Executive",
    canAccessFinanceWorkspace: hasSubscriptionCapability(subscriptionPlan, "financeWorkspace"),
    marketOverview: {
      totalGames: totals._count._all,
      averageReviewScore: totals._avg.reviewScore ?? 0,
      trackedGamesCount: trackedGames.length
    },
    guidedJourney: {
      tierLabel:
        subscriptionPlan === SubscriptionPlan.FREE
          ? "Core validation track"
          : subscriptionPlan === SubscriptionPlan.PLUS
            ? "Studio operating track"
            : "Executive operating track",
      completedSteps: completedJourneySteps,
      totalSteps: guidedJourneySteps.length,
      progressPercent: Math.round((completedJourneySteps / guidedJourneySteps.length) * 100),
      nextStep: guidedJourneySteps.find((step) => !step.completed) ?? null,
      steps: guidedJourneySteps
    },
    projectSignals: thesisSignals,
    portfolioReadiness,
    financeSnapshot: {
      netCashCents: financeOverview.summary.netCashCents,
      pendingRevenueCents: financeOverview.summary.pendingRevenueCents,
      pendingExpenseCents: financeOverview.summary.pendingExpenseCents,
      activeBudgetsCount: financeOverview.summary.activeBudgetsCount
    },
    trackedGames,
    recentLaunches,
    topRevenue,
    fastestGrowing
  };
}

export async function getOpportunityFinderData() {
  const games = await db.steamGame.findMany({
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
    where: {
      reviewScore: {
        not: null
      }
    },
    take: 100
  });

  const items = games.map((game) => {
    const peers = games.filter((candidate) =>
      candidate.genres.some((genre) =>
        game.genres.some((current) => current.steamGenreId === genre.steamGenreId)
      )
    );
    const profile = buildGameOpportunityProfile(game, peers);
    const medianNetRevenueCents = revenueToNumber(game.revenueEstimates[0]?.medianNetRevenueCents);
    const priceBand = game.priceCurrent?.finalPriceCents ?? 0;

    return {
      appId: game.appId,
      name: game.name,
      score: profile.opportunityScore,
      reviewScore: game.reviewScore,
      competitionCount: profile.segmentSize,
      medianNetRevenueCents,
      priceCents: priceBand,
      riskScore: profile.riskScore,
      revenuePotentialScore: profile.revenuePotentialScore,
      underservedScore: profile.underservedScore,
      executionBarScore: profile.executionBarScore,
      confidenceScore: profile.confidenceScore,
      marketSizeLabel: profile.marketSizeLabel,
      premiumSharePercent: profile.premiumSharePercent,
      launchDensityScore: profile.launchDensityScore
    };
  });

  return items.sort((a, b) => b.score - a.score).slice(0, 25);
}

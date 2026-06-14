import { Prisma, SubscriptionPlan } from "@prisma/client";

import { db } from "@/lib/db";
import { getFinanceSummary } from "@/lib/finance-service";
import { buildGameOpportunityProfile, buildSegmentIntelligence } from "@/lib/market-intelligence";
import { fetchSteamCatalogAppIds, fetchSteamSearchAppIds } from "@/lib/steam/client";
import { syncSteamApp } from "@/lib/steam/ingest";
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
  const sorted = values.filter((value: any) => Number.isFinite(value)).sort((left, right) => left - right);

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

function isSteamGameStale(lastIngestedAt: Date | null | undefined) {
  if (!lastIngestedAt) {
    return true;
  }

  return lastIngestedAt < daysAgo(7);
}

async function syncSteamAppIds(appIds: number[], limit = 6) {
  const selectedAppIds = [...new Set(appIds)].filter((appId) => Number.isInteger(appId) && appId > 0).slice(0, limit);

  if (selectedAppIds.length === 0) {
    return {
      requested: 0,
      synced: 0,
      skipped: 0,
      failed: 0,
      appIds: [] as number[]
    };
  }

  const existingGames = await db.steamGame.findMany({
    where: {
      appId: {
        in: selectedAppIds
      }
    },
    select: {
      appId: true,
      lastIngestedAt: true
    }
  });
  const existingByAppId = new Map(existingGames.map((game: any) => [game.appId, game]));
  const appIdsToSync = selectedAppIds.filter((appId) => isSteamGameStale(existingByAppId.get(appId)?.lastIngestedAt));
  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (const appId of appIdsToSync) {
    try {
      const result = await syncSteamApp(appId);

      if (result === "SUCCESS") {
        synced += 1;
        continue;
      }

      skipped += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    requested: selectedAppIds.length,
    synced,
    skipped,
    failed,
    appIds: selectedAppIds
  };
}

function getRotatingSteamCatalogOffset(limit: number) {
  const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60));
  return (hourBucket * limit) % 50_000;
}

async function syncSteamCatalogPage(limit: number, offset: number) {
  const appIds = await fetchSteamCatalogAppIds(offset, limit * 3).catch(() => []);
  const sync = await syncSteamAppIds(appIds, limit);

  return {
    source: "steam-official-app-list",
    query: null,
    offset,
    ...sync
  };
}

async function syncSteamSearchQuery(query?: string) {
  const trimmedQuery = query?.trim();

  if (!trimmedQuery) {
    return null;
  }

    let resolvedValue0: any;
  if (/^\d+$/.test(trimmedQuery)) {
    resolvedValue0 = Number(trimmedQuery);
  } else {
    resolvedValue0 = null;
  }
const directAppId = resolvedValue0;
    let resolvedValue1: any;
  if (directAppId) {
    resolvedValue1 = [];
  } else {
    resolvedValue1 = await fetchSteamSearchAppIds(trimmedQuery, 8).catch(() => []);
  }
const searchAppIds = resolvedValue1;
    let resolvedValue2: any;
  if (directAppId) {
    resolvedValue2 = [directAppId];
  } else {
    resolvedValue2 = [];
  }
  let resolvedValue3: any;
  if (directAppId) {
    resolvedValue3 = 1;
  } else {
    resolvedValue3 = 6;
  }
const sync = await syncSteamAppIds([
    ...(resolvedValue2),
    ...searchAppIds
  ], resolvedValue3);

  return {
    source: "steam-live-search",
    query: trimmedQuery,
    ...sync
  };
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

    let resolvedValue4: any;
  if (baselineValue > 0) {
    resolvedValue4 = Math.round(((latestValue - baselineValue) / baselineValue) * 100);
  } else {
    resolvedValue4 = null;
  }
return {
    current: latestValue,
    baseline: baselineValue,
    absoluteChange: latestValue - baselineValue,
    relativeChangePercent: resolvedValue4,
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
  const hasFilters = Boolean(input.query || input.genre || input.tag || input.minPrice !== undefined || input.maxPrice !== undefined || input.minReviewScore !== undefined || input.fromReleaseDate || input.toReleaseDate);
    let resolvedValue5: any;
  if (page === 1 && input.query) {
    resolvedValue5 = await syncSteamSearchQuery(input.query);
  } else {
        let resolvedValue34: any;
    if (!hasFilters && page <= 5) {
      resolvedValue34 = await syncSteamCatalogPage(Math.min(pageSize, 10), (page - 1) * pageSize);
    } else {
      resolvedValue34 = null;
    }
resolvedValue5 = resolvedValue34;
  }
const steamSync = resolvedValue5;

    let resolvedValue6: any;
  if (input.query) {
    resolvedValue6 = {
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
        };
  } else {
    resolvedValue6 = {};
  }
  let resolvedValue7: any;
  if (input.genre) {
    resolvedValue7 = {
          genres: {
            some: {
              steamGenre: {
                slug: input.genre
              }
            }
          }
        };
  } else {
    resolvedValue7 = {};
  }
  let resolvedValue8: any;
  if (input.tag) {
    resolvedValue8 = {
          tags: {
            some: {
              steamTag: {
                slug: input.tag
              }
            }
          }
        };
  } else {
    resolvedValue8 = {};
  }
  let resolvedValue9: any;
  if (input.minReviewScore !== undefined) {
    resolvedValue9 = {
          reviewScore: {
            gte: input.minReviewScore
          }
        };
  } else {
    resolvedValue9 = {};
  }
  let resolvedValue10: any;
  if (input.fromReleaseDate || input.toReleaseDate) {
        let resolvedValue35: any;
    if (input.fromReleaseDate) {
      resolvedValue35 = { gte: input.fromReleaseDate };
    } else {
      resolvedValue35 = {};
    }
    let resolvedValue36: any;
    if (input.toReleaseDate) {
      resolvedValue36 = { lte: input.toReleaseDate };
    } else {
      resolvedValue36 = {};
    }
resolvedValue10 = {
          releaseDate: {
            ...(resolvedValue35),
            ...(resolvedValue36)
          }
        };
  } else {
    resolvedValue10 = {};
  }
  let resolvedValue11: any;
  if (input.minPrice !== undefined || input.maxPrice !== undefined) {
        let resolvedValue37: any;
    if (input.minPrice !== undefined) {
      resolvedValue37 = { gte: input.minPrice };
    } else {
      resolvedValue37 = {};
    }
    let resolvedValue38: any;
    if (input.maxPrice !== undefined) {
      resolvedValue38 = { lte: input.maxPrice };
    } else {
      resolvedValue38 = {};
    }
resolvedValue11 = {
          priceCurrent: {
            is: {
              finalPriceCents: {
                ...(resolvedValue37),
                ...(resolvedValue38)
              }
            }
          }
        };
  } else {
    resolvedValue11 = {};
  }
const where: Prisma.SteamGameWhereInput = {
    ...(resolvedValue6),
    ...(resolvedValue7),
    ...(resolvedValue8),
    ...(resolvedValue9),
    ...(resolvedValue10),
    ...(resolvedValue11)
  };

    let resolvedValue12: any;
  if (hasFilters) {
    resolvedValue12 = [{ reviewCount: "desc" }, { appId: "asc" }];
  } else {
    resolvedValue12 = [{ lastIngestedAt: "desc" }, { reviewCount: "desc" }, { appId: "asc" }];
  }
const [items, total] = await Promise.all([
    db.steamGame.findMany({
      where,
      include: gameInclude,
      orderBy: resolvedValue12,
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    db.steamGame.count({ where })
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    steamSync
  };
}

export async function getGameByAppId(appId: number) {
  await syncSteamAppIds([appId], 1);

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
    let resolvedValue13: any;
  if (plan === "FREE") {
    resolvedValue13 = "Basic access";
  } else {
        let resolvedValue39: any;
    if (plan === "PLUS") {
      resolvedValue39 = "Advanced access";
    } else {
      resolvedValue39 = "Unlimited";
    }
resolvedValue13 = resolvedValue39;
  }
return {
    label:
      resolvedValue13,
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
  await syncSteamAppIds([appId], 1);

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
  await syncSteamAppIds([appId], 1);

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

  const genreIds = game.genres.map((genre: any) => genre.steamGenreId);
  const tagIds = game.tags.map((tag: any) => tag.steamTagId);
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

    let resolvedValue14: any;
  if (peerRules.length > 0) {
    resolvedValue14 = { OR: peerRules };
  } else {
    resolvedValue14 = {};
  }
const peers = await db.steamGame.findMany({
    where: {
      id: {
        not: game.id
      },
      ...(resolvedValue14)
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
    let resolvedValue15: any;
  if (previousYearPeers.length > 0) {
    resolvedValue15 = recentPeers.length / previousYearPeers.length;
  } else {
        let resolvedValue40: any;
    if (recentPeers.length > 0) {
      resolvedValue40 = 1;
    } else {
      resolvedValue40 = 0;
    }
resolvedValue15 = resolvedValue40;
  }
const growthRatio = resolvedValue15;
    let resolvedValue16: any;
  if (currentPrice === 0 || medianPeerPrice === 0) {
    resolvedValue16 = 65;
  } else {
    resolvedValue16 = clampScore(100 - Math.abs(currentPrice - medianPeerPrice) / medianPeerPrice * 100);
  }
const priceCompatibilityScore = resolvedValue16;
  const demandScore = clampScore(Math.log10((game.reviewCount ?? 0) + 1) * 22);
  const competitionScore = clampScore(100 - Math.min(85, peers.length / 4));
    let resolvedValue17: any;
  if (growthRatio >= 1) {
    resolvedValue17 = 55 + Math.min(35, (growthRatio - 1) * 35);
  } else {
    resolvedValue17 = 45 * growthRatio;
  }
const growthScore = clampScore(
    (resolvedValue17)
    + Math.min(15, Math.max(0, reviewVelocity30?.relativeChangePercent ?? 0) / 2)
  );
  const sentimentScore = clampScore(game.reviewScore ?? 50);
    let resolvedValue18: any;
  if (medianPeerRevenue > 0) {
    resolvedValue18 = clampScore(Math.log10(gameMedianRevenue + 1) / Math.log10(medianPeerRevenue * 4 + 1) * 100);
  } else {
    resolvedValue18 = demandScore;
  }
const historicalPerformanceScore = resolvedValue18;
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
      peer.genres.some((genre: any) => genreIds.includes(genre.steamGenreId))
      && peer.tags.some((tag: any) => tagIds.includes(tag.steamTagId))
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
    .map((tag: any) => {
      let resolvedValue19: any;
      if (recentPeers.length > 0) {
        resolvedValue19 = Math.round((tag.recent / recentPeers.length) * 100);
      } else {
        resolvedValue19 = 0;
      }
      let resolvedValue20: any;
      if (peers.length > 0) {
        resolvedValue20 = Math.round((tag.total / peers.length) * 100);
      } else {
        resolvedValue20 = 0;
      }
      return ({
      name: tag.name,
      recentSharePercent: resolvedValue19,
      datasetSharePercent: resolvedValue20
    });
    })
    .filter((tag: any) => tag.recentSharePercent > tag.datasetSharePercent && tag.recentSharePercent >= 10)
    .sort((left, right) => right.recentSharePercent - left.recentSharePercent)
    .slice(0, 6);
  const observedPrices = priceSnapshots.map((snapshot) => snapshot.finalPriceCents ?? 0).filter((price) => price > 0);
  const observedPlayers = playerSnapshots.map((snapshot) => snapshot.currentPlayers).filter((players) => players > 0);

    let resolvedValue21: any;
  if (opportunityScore >= 75) {
    resolvedValue21 = "High probability opportunity";
  } else {
        let resolvedValue41: any;
    if (opportunityScore >= 58) {
      resolvedValue41 = "Medium confidence market";
    } else {
            let resolvedValue47: any;
      if (peers.length > 120) {
        resolvedValue47 = "Oversaturated segment";
      } else {
        resolvedValue47 = "Low evidence opportunity";
      }
resolvedValue41 = resolvedValue47;
    }
resolvedValue21 = resolvedValue41;
  }
  let resolvedValue22: any;
  if (dataQualityScore >= 75) {
    resolvedValue22 = "High";
  } else {
        let resolvedValue42: any;
    if (dataQualityScore >= 50) {
      resolvedValue42 = "Medium";
    } else {
      resolvedValue42 = "Low";
    }
resolvedValue22 = resolvedValue42;
  }
  let resolvedValue23: any;
  if (game.reviewScore) {
    resolvedValue23 = `${game.reviewScore.toFixed(1)}%`;
  } else {
    resolvedValue23 = "N/A";
  }
  let resolvedValue24: any;
  if (game.revenueEstimates.length > 0) {
    resolvedValue24 = formatCurrency(gameMedianRevenue);
  } else {
    resolvedValue24 = "N/A";
  }
  let resolvedValue25: any;
  if (peers.length >= 160) {
    resolvedValue25 = "High";
  } else {
        let resolvedValue43: any;
    if (peers.length >= 60) {
      resolvedValue43 = "Medium";
    } else {
      resolvedValue43 = "Low";
    }
resolvedValue25 = resolvedValue43;
  }
  let resolvedValue26: any;
  if (observedPrices.length > 0) {
    resolvedValue26 = Math.min(...observedPrices);
  } else {
    resolvedValue26 = null;
  }
  let resolvedValue27: any;
  if (observedPrices.length > 0) {
    resolvedValue27 = Math.max(...observedPrices);
  } else {
    resolvedValue27 = null;
  }
  let resolvedValue28: any;
  if (observedPlayers.length > 0) {
    resolvedValue28 = Math.max(...observedPlayers);
  } else {
    resolvedValue28 = null;
  }
  let resolvedValue29: any;
  if (observedPlayers.length > 0) {
    resolvedValue29 = Math.round(observedPlayers.reduce((sum, value) => sum + value, 0) / observedPlayers.length);
  } else {
    resolvedValue29 = null;
  }
  let resolvedValue30: any;
  if (growthRatio >= 1.25) {
    resolvedValue30 = "Rising";
  } else {
        let resolvedValue44: any;
    if (growthRatio <= 0.75) {
      resolvedValue44 = "Cooling";
    } else {
      resolvedValue44 = "Stable";
    }
resolvedValue30 = resolvedValue44;
  }
  let resolvedValue31: any;
  if (growthRatio >= 1.25) {
    resolvedValue31 = "Similar Steam releases are appearing faster than the prior-year cohort, which usually indicates stronger category attention and higher discoverability competition.";
  } else {
        let resolvedValue45: any;
    if (growthRatio <= 0.75) {
      resolvedValue45 = "The comparable release cadence is lower than the prior-year cohort, which can mean category cooling or a less crowded release window.";
    } else {
      resolvedValue45 = "Comparable release cadence is broadly stable against the prior-year cohort.";
    }
resolvedValue31 = resolvedValue45;
  }
return {
    appId: game.appId,
    name: game.name,
    generatedAt: now.toISOString(),
    classification:
      resolvedValue21,
    opportunityScore,
    confidenceLevel: resolvedValue22,
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
      { name: "User sentiment", score: sentimentScore, weight: 14, evidence: `${resolvedValue23} review score.` },
      { name: "Historical performance", score: historicalPerformanceScore, weight: 14, evidence: `${resolvedValue24} estimated median net revenue.` }
    ],
    marketSignals: {
      demandScore,
      competitionScore,
      growthScore,
      sentimentScore,
      genreSaturation: resolvedValue25,
      growthRatio: Number(growthRatio.toFixed(2)),
      reviewVelocity30,
      playerVelocity30
    },
    observedHistory: {
      price: {
        currentPriceCents: currentPrice,
        lowestObservedPriceCents: resolvedValue26,
        highestObservedPriceCents: resolvedValue27,
        discountSnapshotCount: priceSnapshots.filter((snapshot) => (snapshot.discountPercent ?? 0) > 0).length
      },
      players: {
        currentPlayers: game.currentPlayers,
        peakObservedPlayers: resolvedValue28,
        averageObservedPlayers: resolvedValue29
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
      releaseMomentum: resolvedValue30,
      explanation:
        resolvedValue31,
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
  await syncSteamAppIds(appIds, 10);

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

function getPortfolioReadiness(projectAnalyses: Array<{
  project: {
    id: string;
    name: string;
    stage: string;
  };
  metadata: Prisma.JsonValue;
}>) {
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
  const scoredSignals = thesisSignals.filter((item: any) => item.opportunityScore !== null);
    let resolvedValue32: any;
  if (scoredSignals.length > 0) {
    resolvedValue32 = {
        averageOpportunityScore: Math.round(scoredSignals.reduce((sum, item) => sum + (item.opportunityScore ?? 0), 0) / scoredSignals.length),
        averageRiskScore: Math.round(scoredSignals.reduce((sum, item) => sum + (item.riskScore ?? 0), 0) / scoredSignals.length),
        averageFitScore: Math.round(scoredSignals.reduce((sum, item) => sum + (item.fitScore ?? 0), 0) / scoredSignals.length),
        topThesis: [...scoredSignals].sort((left, right) => (right.opportunityScore ?? 0) - (left.opportunityScore ?? 0))[0] ?? null
      };
  } else {
    resolvedValue32 = null;
  }
const portfolioReadiness = resolvedValue32;

  return {
    thesisSignals,
    portfolioReadiness
  };
}

export async function getDashboardSummary(workspaceId: string) {
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
    trackedGamesCount,
    recentLaunchesCount,
    totals,
    projectAnalyses,
    financeSummary
  ] = await Promise.all([
    db.savedGame.count({
      where: { workspaceId }
    }),
    db.steamGame.count({
      where: {
        releaseDate: {
          not: null
        }
      }
    }),
    db.steamGame.aggregate({
      _count: {
        _all: true
      },
      _avg: {
        reviewScore: true
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
    }),
    getFinanceSummary(workspace.organizationId)
  ]);
  const portfolio = getPortfolioReadiness(projectAnalyses);

    let resolvedValue33: any;
  if (subscriptionPlan === SubscriptionPlan.FREE) {
    resolvedValue33 = "Explorer";
  } else {
        let resolvedValue46: any;
    if (subscriptionPlan === SubscriptionPlan.PLUS) {
      resolvedValue46 = "Operating";
    } else {
      resolvedValue46 = "Executive";
    }
resolvedValue33 = resolvedValue46;
  }
return {
    planLabel:
      resolvedValue33,
    canAccessFinanceWorkspace: hasSubscriptionCapability(subscriptionPlan, "financeWorkspace"),
    marketOverview: {
      totalGames: totals._count._all,
      averageReviewScore: totals._avg.reviewScore ?? 0,
      trackedGamesCount
    },
    projectSignalsCount: portfolio.thesisSignals.length,
    portfolioReadiness: portfolio.portfolioReadiness,
    financeSnapshot: {
      netCashCents: financeSummary.netCashCents,
      pendingRevenueCents: financeSummary.pendingRevenueCents,
      pendingExpenseCents: financeSummary.pendingExpenseCents,
      activeBudgetsCount: financeSummary.activeBudgetsCount
    },
    recentLaunchesCount: Math.min(recentLaunchesCount, 10)
  };
}

export async function getDashboardDetails(workspaceId: string) {
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

  const projectAnalyses = await db.projectAnalysis.findMany({
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
  });
  const topRevenue = topRevenueGames
    .flatMap((game: any) => {
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

  const portfolio = getPortfolioReadiness(projectAnalyses);

  return {
    projectSignals: portfolio.thesisSignals,
    trackedGames,
    recentLaunches,
    topRevenue,
    fastestGrowing
  };
}

export async function getDashboardData(workspaceId: string) {
  const [summary, details] = await Promise.all([
    getDashboardSummary(workspaceId),
    getDashboardDetails(workspaceId)
  ]);

  return {
    ...summary,
    ...details
  };
}

export async function getOpportunityFinderData() {
  await syncSteamCatalogPage(10, getRotatingSteamCatalogOffset(10));

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
      reviewCount: {
        gt: 0
      },
      reviewScore: {
        not: null
      }
    },
    orderBy: [
      {
        lastIngestedAt: "desc"
      },
      {
        reviewCount: "desc"
      }
    ],
    take: 250
  });

  const items = games.map((game: any) => {
    const peers = games.filter((candidate) =>
      candidate.genres.some((genre: any) =>
        game.genres.some((current: any) => current.steamGenreId === genre.steamGenreId)
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

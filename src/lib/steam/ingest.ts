import { Prisma } from "@prisma/client";

import { env } from "@/env";
import { db } from "@/lib/db";
import { calculateRevenueEstimate, calculateSalesEstimate } from "@/lib/estimations";
import { logger } from "@/lib/logger";
import { bootstrapSteamApps } from "@/lib/steam/bootstrap-apps";
import {
  fetchSteamAppDetails,
  fetchSteamAppList,
  fetchSteamCurrentPlayers,
  fetchSteamReviewSummary
} from "@/lib/steam/client";
import { extractStoreTags, normalizeSteamApp } from "@/lib/steam/normalize";
import { sleep } from "@/lib/sleep";

type SteamSyncResult = "SUCCESS" | "SKIPPED";

export type SteamBatchSyncMode = "refresh" | "catalog";

function getBootstrapAppIds(limit: number, offset: number) {
  return bootstrapSteamApps.slice(offset, offset + limit).map((app) => app.appid);
}

async function syncGenres(
  tx: Prisma.TransactionClient,
  steamGameId: string,
  genres: Array<{ steamGenreId: number | null; name: string; slug: string }>
) {
  await tx.steamGameGenre.deleteMany({
    where: {
      steamGameId
    }
  });

  for (const genre of genres) {
    const record = await tx.steamGenre.upsert({
      where: {
        slug: genre.slug
      },
      update: {
        name: genre.name,
        steamGenreId: genre.steamGenreId ?? undefined
      },
      create: genre
    });

    await tx.steamGameGenre.create({
      data: {
        steamGameId,
        steamGenreId: record.id
      }
    });
  }
}

async function syncTags(
  tx: Prisma.TransactionClient,
  steamGameId: string,
  tags: Array<{ name: string; slug: string }>
) {
  await tx.steamGameTag.deleteMany({
    where: {
      steamGameId
    }
  });

  for (const tag of tags) {
    const record = await tx.steamTag.upsert({
      where: {
        slug: tag.slug
      },
      update: {
        name: tag.name
      },
      create: tag
    });

    await tx.steamGameTag.create({
      data: {
        steamGameId,
        steamTagId: record.id
      }
    });
  }
}

async function syncDevelopers(
  tx: Prisma.TransactionClient,
  steamGameId: string,
  developers: Array<{ name: string; slug: string }>
) {
  await tx.steamGameDeveloper.deleteMany({
    where: {
      steamGameId
    }
  });

  for (const developer of developers) {
    const record = await tx.steamDeveloper.upsert({
      where: {
        slug: developer.slug
      },
      update: {
        name: developer.name
      },
      create: developer
    });

    await tx.steamGameDeveloper.create({
      data: {
        steamGameId,
        steamDeveloperId: record.id
      }
    });
  }
}

async function syncPublishers(
  tx: Prisma.TransactionClient,
  steamGameId: string,
  publishers: Array<{ name: string; slug: string }>
) {
  await tx.steamGamePublisher.deleteMany({
    where: {
      steamGameId
    }
  });

  for (const publisher of publishers) {
    const record = await tx.steamPublisher.upsert({
      where: {
        slug: publisher.slug
      },
      update: {
        name: publisher.name
      },
      create: publisher
    });

    await tx.steamGamePublisher.create({
      data: {
        steamGameId,
        steamPublisherId: record.id
      }
    });
  }
}

export async function syncSteamApp(appId: number): Promise<SteamSyncResult> {
  const run = await db.ingestionRun.create({
    data: {
      source: "steam-app",
      sourceKey: String(appId),
      status: "PENDING"
    }
  });

  try {
    const [details, reviews, playerCount] = await Promise.all([
      fetchSteamAppDetails(appId),
      fetchSteamReviewSummary(appId),
      fetchSteamCurrentPlayers(appId)
    ]);
    const tags = await extractStoreTags(appId, env.STEAM_STORE_BASE_URL).catch((error) => {
      logger.warn({ appId, error }, "Unable to scrape Steam tags");
      return [];
    });
    const normalized = normalizeSteamApp({
      appId,
      details,
      reviewSummary: reviews,
      playerCount,
      tags
    });

    if (!normalized) {
      await db.ingestionRun.update({
        where: { id: run.id },
        data: {
          status: "SKIPPED",
          message: "Unsupported or invalid app",
          finishedAt: new Date()
        }
      });

      return "SKIPPED";
    }

    const salesEstimate = calculateSalesEstimate(normalized, env.STEAM_REVIEW_MULTIPLIER);
    const revenueEstimate = calculateRevenueEstimate(normalized, salesEstimate);

    await db.$transaction(async (tx) => {
      const game = await tx.steamGame.upsert({
        where: {
          appId: normalized.appId
        },
        update: {
          type: normalized.type,
          name: normalized.name,
          slug: normalized.slug,
          shortDescription: normalized.shortDescription,
          releaseDate: normalized.releaseDate,
          releaseDateText: normalized.releaseDateText,
          isFree: normalized.isFree,
          isEarlyAccess: normalized.isEarlyAccess,
          capsuleImageUrl: normalized.capsuleImageUrl,
          headerImageUrl: normalized.headerImageUrl,
          websiteUrl: normalized.websiteUrl,
          supportUrl: normalized.supportUrl,
          metacriticScore: normalized.metacriticScore,
          reviewScore: normalized.reviews.reviewScore,
          reviewScoreLabel: normalized.reviews.reviewScoreLabel,
          reviewCount: normalized.reviews.totalReviews,
          currentPlayers: normalized.currentPlayers,
          supportedLanguages: typeof normalized.rawPayload === "object" && normalized.rawPayload && "supported_languages" in normalized.rawPayload
            ? String((normalized.rawPayload as Record<string, unknown>).supported_languages ?? "")
            : null,
          lastIngestedAt: new Date()
        },
        create: {
          appId: normalized.appId,
          type: normalized.type,
          name: normalized.name,
          slug: normalized.slug,
          shortDescription: normalized.shortDescription,
          releaseDate: normalized.releaseDate,
          releaseDateText: normalized.releaseDateText,
          isFree: normalized.isFree,
          isEarlyAccess: normalized.isEarlyAccess,
          capsuleImageUrl: normalized.capsuleImageUrl,
          headerImageUrl: normalized.headerImageUrl,
          websiteUrl: normalized.websiteUrl,
          supportUrl: normalized.supportUrl,
          metacriticScore: normalized.metacriticScore,
          reviewScore: normalized.reviews.reviewScore,
          reviewScoreLabel: normalized.reviews.reviewScoreLabel,
          reviewCount: normalized.reviews.totalReviews,
          currentPlayers: normalized.currentPlayers,
          supportedLanguages: typeof normalized.rawPayload === "object" && normalized.rawPayload && "supported_languages" in normalized.rawPayload
            ? String((normalized.rawPayload as Record<string, unknown>).supported_languages ?? "")
            : null,
          lastIngestedAt: new Date()
        }
      });

      await syncGenres(tx, game.id, normalized.genres);
      await syncTags(tx, game.id, normalized.tags);
      await syncDevelopers(tx, game.id, normalized.developers);
      await syncPublishers(tx, game.id, normalized.publishers);

      await tx.steamGameSnapshot.create({
        data: {
          steamGameId: game.id,
          ingestionRunId: run.id,
          snapshotDate: new Date(),
          name: normalized.name,
          type: normalized.type,
          shortDescription: normalized.shortDescription,
          releaseDate: normalized.releaseDate,
          releaseDateText: normalized.releaseDateText,
          isFree: normalized.isFree,
          isEarlyAccess: normalized.isEarlyAccess,
          websiteUrl: normalized.websiteUrl,
          supportUrl: normalized.supportUrl,
          metacriticScore: normalized.metacriticScore,
          reviewScore: normalized.reviews.reviewScore,
          reviewCount: normalized.reviews.totalReviews,
          currentPlayers: normalized.currentPlayers,
          rawGenres: normalized.genres,
          rawDevelopers: normalized.developers,
          rawPublishers: normalized.publishers,
          rawPayload: normalized.rawPayload as Prisma.InputJsonValue
        }
      });

      await tx.steamPrice.upsert({
        where: {
          steamGameId: game.id
        },
        update: {
          currency: normalized.currentPrice.currency,
          initialPriceCents: normalized.currentPrice.initialPriceCents,
          finalPriceCents: normalized.currentPrice.finalPriceCents,
          discountPercent: normalized.currentPrice.discountPercent,
          isFree: normalized.currentPrice.isFree,
          lastCheckedAt: new Date()
        },
        create: {
          steamGameId: game.id,
          currency: normalized.currentPrice.currency,
          initialPriceCents: normalized.currentPrice.initialPriceCents,
          finalPriceCents: normalized.currentPrice.finalPriceCents,
          discountPercent: normalized.currentPrice.discountPercent,
          isFree: normalized.currentPrice.isFree
        }
      });

      await tx.steamPriceSnapshot.create({
        data: {
          steamGameId: game.id,
          ingestionRunId: run.id,
          snapshotDate: new Date(),
          currency: normalized.currentPrice.currency,
          initialPriceCents: normalized.currentPrice.initialPriceCents,
          finalPriceCents: normalized.currentPrice.finalPriceCents,
          discountPercent: normalized.currentPrice.discountPercent,
          isFree: normalized.currentPrice.isFree
        }
      });

      await tx.steamReviewSnapshot.create({
        data: {
          steamGameId: game.id,
          ingestionRunId: run.id,
          snapshotDate: new Date(),
          totalReviews: normalized.reviews.totalReviews,
          totalPositiveReviews: normalized.reviews.totalPositiveReviews,
          totalNegativeReviews: normalized.reviews.totalNegativeReviews,
          reviewScore: normalized.reviews.reviewScore,
          reviewScoreLabel: normalized.reviews.reviewScoreLabel
        }
      });

      await tx.steamPlayerCountSnapshot.create({
        data: {
          steamGameId: game.id,
          ingestionRunId: run.id,
          snapshotDate: new Date(),
          currentPlayers: normalized.currentPlayers
        }
      });

      await tx.salesEstimate.create({
        data: {
          steamGameId: game.id,
          ingestionRunId: run.id,
          reviewMultiplier: salesEstimate.reviewMultiplier,
          genreAdjustment: salesEstimate.genreAdjustment,
          priceTierAdjustment: salesEstimate.priceTierAdjustment,
          ageAdjustment: salesEstimate.ageAdjustment,
          confidence: salesEstimate.confidence,
          confidenceScore: salesEstimate.confidenceScore,
          lowEstimate: salesEstimate.lowEstimate,
          medianEstimate: salesEstimate.medianEstimate,
          highEstimate: salesEstimate.highEstimate,
          explanation: salesEstimate.explanation
        }
      });

      await tx.revenueEstimate.create({
        data: {
          steamGameId: game.id,
          ingestionRunId: run.id,
          averagePriceCents: revenueEstimate.averagePriceCents,
          lowGrossRevenueCents: revenueEstimate.lowGrossRevenueCents,
          medianGrossRevenueCents: revenueEstimate.medianGrossRevenueCents,
          highGrossRevenueCents: revenueEstimate.highGrossRevenueCents,
          lowNetRevenueCents: revenueEstimate.lowNetRevenueCents,
          medianNetRevenueCents: revenueEstimate.medianNetRevenueCents,
          highNetRevenueCents: revenueEstimate.highNetRevenueCents,
          confidence: revenueEstimate.confidence,
          confidenceScore: revenueEstimate.confidenceScore,
          explanation: revenueEstimate.explanation
        }
      });
    });

    await db.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date()
      }
    });

    await sleep(env.STEAM_REQUEST_DELAY_MS);
    return "SUCCESS";
  } catch (error) {
    logger.error({ appId, error }, "Steam sync failed");
    await db.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        attempts: {
          increment: 1
        },
        message: error instanceof Error ? error.message : "Unknown error",
        finishedAt: new Date()
      }
    });
    throw error;
  }
}

export async function syncSteamBatch({
  limit = env.STEAM_CRON_BATCH_SIZE,
  mode = "refresh",
  offset = 0
}: {
  limit?: number;
  mode?: SteamBatchSyncMode;
  offset?: number;
}) {
  const cappedLimit = Math.min(limit, env.STEAM_APP_SYNC_LIMIT, 100);
  let appIds: number[] = [];

  if (mode === "catalog") {
    try {
      const list = await fetchSteamAppList();
      appIds = list.applist.apps
        .filter((app) => app.name.trim().length > 0)
        .slice(offset, offset + cappedLimit)
        .map((app) => app.appid);
    } catch (error) {
      logger.warn({ error, offset, limit: cappedLimit }, "Steam app list unavailable, using bootstrap list");
      appIds = getBootstrapAppIds(cappedLimit, offset);
    }
  }

  if (mode === "refresh") {
    const existingGames = await db.steamGame.findMany({
      orderBy: [{ lastIngestedAt: "asc" }, { appId: "asc" }],
      take: cappedLimit,
      select: {
        appId: true
      }
    });

    if (existingGames.length > 0) {
      appIds = existingGames.map((game) => game.appId);
    }

    if (existingGames.length === 0) {
      try {
        const list = await fetchSteamAppList();
        appIds = list.applist.apps
          .filter((app) => app.name.trim().length > 0)
          .slice(offset, offset + cappedLimit)
          .map((app) => app.appid);
      } catch (error) {
        logger.warn({ error, offset, limit: cappedLimit }, "Steam app list unavailable during refresh, using bootstrap list");
        appIds = getBootstrapAppIds(cappedLimit, offset);
      }

      mode = "catalog";
    }
  }

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const appId of appIds) {
    try {
      const result = await syncSteamApp(appId);

      if (result === "SKIPPED") {
        skipped += 1;
        continue;
      }

      succeeded += 1;
    } catch (error) {
      failed += 1;
      logger.error({ appId, error }, "Steam batch sync item failed");
    }
  }

  return {
    mode,
    limit: cappedLimit,
    offset,
    selected: appIds.length,
    succeeded,
    skipped,
    failed,
    appIds
  };
}

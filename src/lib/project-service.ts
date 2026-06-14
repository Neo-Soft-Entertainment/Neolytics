import { Prisma, ProjectStage, SubscriptionPlan } from "@prisma/client";

import { appUrl } from "@/env";
import { db } from "@/lib/db";
import { notifyOrganizationDiscordWebhook } from "@/lib/discord";
import {
  assertCanUseFeature,
  assertCurrentUsageWithinLimit,
  recordUsage
} from "@/lib/entitlements";
import { generateAiProjectArtAnalysis, generateAiProjectMarketAnalysis } from "@/lib/market-analysis-ai";
import { buildHybridMarketIntelligence } from "@/lib/market-intelligence";
import {
  createProjectArtAssetSignedUrl,
  deleteProjectArtAssetFile,
  uploadProjectArtAssetFile
} from "@/lib/project-art-storage";
import { decryptNullableString, encryptNullableString } from "@/lib/security/encryption";
import { slugify } from "@/lib/slugify";
import { fetchSteamSearchAppIds } from "@/lib/steam/client";
import { syncSteamApp } from "@/lib/steam/ingest";
import {
  enforceSubscriptionCapacity,
  recordSubscriptionUsage
} from "@/lib/subscription-service";
import { buildUniqueSlug } from "@/lib/unique-slug";

const defaultKanbanColumns = [
  { name: "Backlog", color: "#64748b" },
  { name: "Research", color: "#0ea5e9" },
  { name: "In Progress", color: "#f59e0b" },
  { name: "Blocked", color: "#ef4444" },
  { name: "Done", color: "#10b981" }
];

function encryptProjectField(value: string | null | undefined, organizationId: string, workspaceId: string, field: string) {
  return encryptNullableString(value?.trim() || null, `project:${organizationId}:${workspaceId}:${field}`);
}

function decryptProjectField(value: string | null | undefined, organizationId: string, workspaceId: string, field: string) {
  return decryptNullableString(value, `project:${organizationId}:${workspaceId}:${field}`);
}

function decryptGdd<T extends { projectId: string; content: string }>(gdd: T) {
  return {
    ...gdd,
    content: decryptNullableString(gdd.content, `projectGdd:${gdd.projectId}:content`) ?? gdd.content
  };
}

function decryptProject<T extends {
  organizationId: string;
  workspaceId: string;
  elevatorPitch?: string | null;
  description?: string | null;
  genreInput?: string | null;
  tagInput?: string | null;
  targetAudience?: string | null;
  coreLoop?: string | null;
  differentiator?: string | null;
  monetizationModel?: string | null;
  artDirection?: string | null;
  playerFantasy?: string | null;
  gdds?: Array<{ projectId: string; content: string }>;
}>(project: T) {
  return {
    ...project,
    elevatorPitch: decryptProjectField(project.elevatorPitch, project.organizationId, project.workspaceId, "elevatorPitch"),
    description: decryptProjectField(project.description, project.organizationId, project.workspaceId, "description"),
    genreInput: decryptProjectField(project.genreInput, project.organizationId, project.workspaceId, "genreInput"),
    tagInput: decryptProjectField(project.tagInput, project.organizationId, project.workspaceId, "tagInput"),
    targetAudience: decryptProjectField(project.targetAudience, project.organizationId, project.workspaceId, "targetAudience"),
    coreLoop: decryptProjectField(project.coreLoop, project.organizationId, project.workspaceId, "coreLoop"),
    differentiator: decryptProjectField(project.differentiator, project.organizationId, project.workspaceId, "differentiator"),
    monetizationModel: decryptProjectField(project.monetizationModel, project.organizationId, project.workspaceId, "monetizationModel"),
    artDirection: decryptProjectField(project.artDirection, project.organizationId, project.workspaceId, "artDirection"),
    playerFantasy: decryptProjectField(project.playerFantasy, project.organizationId, project.workspaceId, "playerFantasy"),
    gdds: project.gdds?.map(decryptGdd)
  } as T;
}

async function hydrateProjectArtAssets<T extends { artAssets?: Array<{ storagePath: string }> }>(project: T) {
  if (!project.artAssets?.length) {
    return project;
  }

  return {
    ...project,
    artAssets: await Promise.all(project.artAssets.map(async (asset) => ({
      ...asset,
      signedUrl: await createProjectArtAssetSignedUrl(asset.storagePath).catch(() => null)
    })))
  };
}

function parseCsv(value?: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(/[,\n;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const projectSearchStopWords = new Set([
  "about",
  "across",
  "action",
  "advanced",
  "against",
  "around",
  "battle",
  "battles",
  "built",
  "chaotic",
  "city",
  "close",
  "combat",
  "combines",
  "connected",
  "consumed",
  "deliver",
  "different",
  "dimensional",
  "each",
  "energy",
  "engineered",
  "every",
  "fight",
  "fps",
  "first",
  "first-person",
  "from",
  "game",
  "games",
  "high",
  "instead",
  "length",
  "master",
  "multiplayer",
  "player",
  "players",
  "project",
  "shooter",
  "singleplayer",
  "speed",
  "takes",
  "tactical",
  "that",
  "their",
  "through",
  "unique",
  "using",
  "where",
  "with",
  "jogo",
  "jogador",
  "jogadores",
  "para",
  "como",
  "uma",
  "que"
]);

function revenueToNumber(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[midpoint - 1] + sorted[midpoint]) / 2);
  }

  return sorted[midpoint];
}

function clampScore(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentileValue) - 1));

  return sorted[index];
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function formatMoney(valueCents: number) {
  return (valueCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
}

function getConfidenceLabel(score: number) {
  if (score >= 80) {
    return "High";
  }

  if (score >= 60) {
    return "Medium";
  }

  return "Low";
}

function getMarketSizeLabel(totalRevenueCents: number) {
  if (totalRevenueCents >= 100_000_000) {
    return "Large";
  }

  if (totalRevenueCents >= 25_000_000) {
    return "Mid-sized";
  }

  if (totalRevenueCents > 0) {
    return "Emerging";
  }

  return "Unknown";
}

function getPriceBandDistribution(values: number[]) {
  const bands = {
    under10: 0,
    between10And20: 0,
    between20And30: 0,
    over30: 0
  };

  for (const value of values) {
    if (value < 1000) {
      bands.under10 += 1;
      continue;
    }

    if (value < 2000) {
      bands.between10And20 += 1;
      continue;
    }

    if (value < 3000) {
      bands.between20And30 += 1;
      continue;
    }

    bands.over30 += 1;
  }

  return bands;
}

function getReviewVelocity(reviewSnapshots: Array<{
  steamGameId: string;
  snapshotDate: Date;
  totalReviews: number;
}>) {
  const grouped = new Map<string, Array<{ snapshotDate: Date; totalReviews: number }>>();

  for (const snapshot of reviewSnapshots) {
    const list = grouped.get(snapshot.steamGameId) ?? [];
    list.push({
      snapshotDate: snapshot.snapshotDate,
      totalReviews: snapshot.totalReviews
    });
    grouped.set(snapshot.steamGameId, list);
  }

  let total90 = 0;
  let totalPrevious90 = 0;
  let coveredGames = 0;
  const now = Date.now();
  const days90 = 90 * 24 * 60 * 60 * 1000;
  const days180 = 180 * 24 * 60 * 60 * 1000;

  for (const entries of grouped.values()) {
    const ordered = [...entries].sort((left, right) => left.snapshotDate.getTime() - right.snapshotDate.getTime());
    const latest = ordered[ordered.length - 1];
    const baseline90 = ordered.find((entry) => latest.snapshotDate.getTime() - entry.snapshotDate.getTime() <= days90);
    const baseline180 = ordered.find((entry) => now - entry.snapshotDate.getTime() <= days180);

    if (!baseline90 || !baseline180) {
      continue;
    }

    const reviews90 = Math.max(0, latest.totalReviews - baseline90.totalReviews);
    const reviews180 = Math.max(0, latest.totalReviews - baseline180.totalReviews);
    total90 += reviews90;
    totalPrevious90 += Math.max(0, reviews180 - reviews90);
    coveredGames += 1;
  }

  return {
    reviewVelocity90: total90,
    previousReviewVelocity90: totalPrevious90,
    coveredGames
  };
}

function getPlayerMomentum(playerSnapshots: Array<{
  steamGameId: string;
  snapshotDate: Date;
  currentPlayers: number;
}>) {
  const grouped = new Map<string, Array<{ snapshotDate: Date; currentPlayers: number }>>();

  for (const snapshot of playerSnapshots) {
    const list = grouped.get(snapshot.steamGameId) ?? [];
    list.push({
      snapshotDate: snapshot.snapshotDate,
      currentPlayers: snapshot.currentPlayers
    });
    grouped.set(snapshot.steamGameId, list);
  }

  let currentWindow = 0;
  let previousWindow = 0;
  let currentSamples = 0;
  let previousSamples = 0;
  const now = Date.now();
  const days30 = 30 * 24 * 60 * 60 * 1000;
  const days60 = 60 * 24 * 60 * 60 * 1000;

  for (const entries of grouped.values()) {
    for (const entry of entries) {
      const age = now - entry.snapshotDate.getTime();

      if (age <= days30) {
        currentWindow += entry.currentPlayers;
        currentSamples += 1;
        continue;
      }

      if (age <= days60) {
        previousWindow += entry.currentPlayers;
        previousSamples += 1;
      }
    }
  }

  const currentAverage = currentSamples > 0 ? currentWindow / currentSamples : 0;
  const previousAverage = previousSamples > 0 ? previousWindow / previousSamples : 0;

  return {
    playerMomentum30: currentAverage,
    previousPlayerMomentum30: previousAverage,
    coveredSamples: currentSamples + previousSamples
  };
}

function getDominantMonetization(project: {
  monetizationModel: string | null;
}, games: Array<{ isFree: boolean }>) {
  const freeCount = games.filter((game) => game.isFree).length;
  const dominant = freeCount >= Math.ceil(games.length / 2) ? "free-to-play" : "premium";
  const input = project.monetizationModel?.trim().toLowerCase() ?? "";

  return {
    dominant,
    fitScore: input
      ? dominant === "free-to-play"
        ? (input.includes("free") ? 90 : 40)
        : (input.includes("premium") || input.includes("paid") ? 90 : 45)
      : 60
  };
}

function getProjectKeywords(project: {
  name: string;
  genreInput: string | null;
  tagInput: string | null;
  elevatorPitch?: string | null;
  description?: string | null;
  differentiator?: string | null;
  playerFantasy?: string | null;
  targetAudience?: string | null;
  coreLoop?: string | null;
}) {
  const text = [
    project.name,
    project.elevatorPitch,
    project.description,
    project.differentiator,
    project.playerFantasy,
    project.targetAudience,
    project.coreLoop,
    project.genreInput,
    project.tagInput
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const keywords = text
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim().replace(/^-+|-+$/g, ""))
    .filter((word) => word.length >= 3 && !projectSearchStopWords.has(word));

  return [...new Set(keywords)].slice(0, 40);
}

function getProjectSearchPhrases(project: {
  name: string;
  genreInput: string | null;
  tagInput: string | null;
  elevatorPitch?: string | null;
  description?: string | null;
  differentiator?: string | null;
  playerFantasy?: string | null;
  targetAudience?: string | null;
  coreLoop?: string | null;
}) {
  const phrases: string[] = [];
  const keywords = getProjectKeywords(project);

  for (let index = 0; index < keywords.length - 2; index += 1) {
    phrases.push(`${keywords[index]} ${keywords[index + 1]} ${keywords[index + 2]}`);
  }

  for (let index = 0; index < keywords.length - 1; index += 1) {
    phrases.push(`${keywords[index]} ${keywords[index + 1]}`);
  }

  phrases.push(
    project.playerFantasy ?? "",
    project.differentiator ?? "",
    project.coreLoop ?? "",
    ...parseCsv(project.genreInput),
    ...parseCsv(project.tagInput)
  );

  const cleanedPhrases = phrases
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim())
    .filter((value) => value.length >= 4 && value.length <= 80);

  if (project.name.trim().length >= 4) {
    cleanedPhrases.push(project.name.trim());
  }

  return [...new Set(cleanedPhrases)]
    .filter((phrase) => phrase.split(/\s+/).some((word) => !projectSearchStopWords.has(word.toLowerCase())))
    .slice(0, 8);
}

function getGameTextSimilarity(projectKeywords: string[], game: {
  name: string;
  shortDescription: string | null;
  genres: Array<{ steamGenre: { name: string; slug: string } }>;
  tags: Array<{ steamTag: { name: string; slug: string } }>;
}) {
  if (projectKeywords.length === 0) {
    return 0;
  }

  const text = [
    game.name,
    game.shortDescription,
    ...game.genres.map((genre) => genre.steamGenre.name),
    ...game.tags.map((tag) => tag.steamTag.name)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const matches = projectKeywords.filter((keyword) => text.includes(keyword)).length;
  const coverage = matches / Math.min(projectKeywords.length, 12);

  return clampScore(coverage * 100);
}

async function ensureProjectSteamCoverage(project: {
  name: string;
  genreInput: string | null;
  tagInput: string | null;
  elevatorPitch?: string | null;
  description?: string | null;
  differentiator?: string | null;
  playerFantasy?: string | null;
  targetAudience?: string | null;
  coreLoop?: string | null;
}) {
  const phrases = getProjectSearchPhrases(project);

  if (phrases.length === 0) {
    return {
      phrases,
      discoveredAppIds: [] as number[],
      syncedAppIds: [] as number[]
    };
  }

  const discoveredAppIds = new Set<number>();

  for (const phrase of phrases) {
    const appIds = await fetchSteamSearchAppIds(phrase, 8).catch(() => []);

    for (const appId of appIds) {
      discoveredAppIds.add(appId);
    }
  }

  const selectedAppIds = [...discoveredAppIds].slice(0, 18);
  const existingGames = selectedAppIds.length > 0
    ? await db.steamGame.findMany({
        where: {
          appId: {
            in: selectedAppIds
          }
        },
        select: {
          appId: true,
          lastIngestedAt: true
        }
      })
    : [];
  const existingByAppId = new Map(existingGames.map((game) => [game.appId, game]));
  const staleThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const appIdsToSync = selectedAppIds
    .filter((appId) => {
      const existing = existingByAppId.get(appId);
      return !existing || !existing.lastIngestedAt || existing.lastIngestedAt < staleThreshold;
    })
    .slice(0, 10);
  const syncedAppIds: number[] = [];

  for (const appId of appIdsToSync) {
    try {
      const result = await syncSteamApp(appId);

      if (result === "SUCCESS") {
        syncedAppIds.push(appId);
      }
    } catch {
      continue;
    }
  }

  return {
    phrases,
    discoveredAppIds: selectedAppIds,
    syncedAppIds
  };
}

async function getProjectSignalSlugs(project: {
  name: string;
  genreInput: string | null;
  tagInput: string | null;
  elevatorPitch?: string | null;
  description?: string | null;
  differentiator?: string | null;
  playerFantasy?: string | null;
  targetAudience?: string | null;
  coreLoop?: string | null;
}) {
  const genreTokens = parseCsv(project.genreInput).map(slugify);
  const tagTokens = parseCsv(project.tagInput).map(slugify);
  const corpus = [
    project.genreInput,
    project.tagInput,
    project.elevatorPitch,
    project.description,
    project.differentiator,
    project.playerFantasy,
    project.targetAudience,
    project.coreLoop
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!corpus.trim()) {
    return {
      genreTokens,
      tagTokens
    };
  }

  const [genres, tags] = await Promise.all([
    db.steamGenre.findMany({
      select: {
        slug: true,
        name: true
      }
    }),
    db.steamTag.findMany({
      select: {
        slug: true,
        name: true
      }
    })
  ]);

  for (const genre of genres) {
    const normalizedName = genre.name.toLowerCase();
    const normalizedSlug = genre.slug.replaceAll("-", " ").toLowerCase();

    if (corpus.includes(normalizedName) || corpus.includes(normalizedSlug)) {
      genreTokens.push(genre.slug);
    }
  }

  for (const tag of tags) {
    const normalizedName = tag.name.toLowerCase();
    const normalizedSlug = tag.slug.replaceAll("-", " ").toLowerCase();

    if (corpus.includes(normalizedName) || corpus.includes(normalizedSlug)) {
      tagTokens.push(tag.slug);
    }
  }

  return {
    genreTokens: [...new Set(genreTokens)],
    tagTokens: [...new Set(tagTokens)]
  };
}

async function buildProjectMatchingRules(project: {
  name: string;
  genreInput: string | null;
  tagInput: string | null;
  elevatorPitch?: string | null;
  description?: string | null;
  differentiator?: string | null;
  playerFantasy?: string | null;
  targetAudience?: string | null;
  coreLoop?: string | null;
}) {
  const { genreTokens, tagTokens } = await getProjectSignalSlugs(project);
  const projectKeywords = getProjectKeywords(project).slice(0, 12);
  const matchingRules: Prisma.SteamGameWhereInput[] = [];

  if (genreTokens.length > 0) {
    matchingRules.push({
      genres: {
        some: {
          steamGenre: {
            slug: {
              in: genreTokens
            }
          }
        }
      }
    });
  }

  if (tagTokens.length > 0) {
    matchingRules.push({
      tags: {
        some: {
          steamTag: {
            slug: {
              in: tagTokens
            }
          }
        }
      }
    });
  }

  if (project.name.trim()) {
    matchingRules.push({
      name: {
        contains: project.name.trim(),
        mode: "insensitive"
      }
    });
  }

  for (const keyword of projectKeywords) {
    matchingRules.push({
      OR: [
        {
          name: {
            contains: keyword,
            mode: "insensitive"
          }
        },
        {
          shortDescription: {
            contains: keyword,
            mode: "insensitive"
          }
        }
      ]
    });
  }

  return matchingRules;
}

async function getComparableGames(project: {
  name: string;
  genreInput: string | null;
  tagInput: string | null;
  elevatorPitch?: string | null;
  description?: string | null;
  differentiator?: string | null;
  playerFantasy?: string | null;
  targetAudience?: string | null;
  coreLoop?: string | null;
}) {
  const matchingRules = await buildProjectMatchingRules(project);

  return db.steamGame.findMany({
    where: matchingRules.length > 0 ? { OR: matchingRules } : undefined,
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
    orderBy: [
      {
        reviewCount: "desc"
      }
    ],
    take: 120
  });
}

const projectInclude = {
  analysis: true,
  competitorGames: {
    include: {
      steamGame: {
        include: {
          priceCurrent: true,
          genres: {
            include: {
              steamGenre: true
            }
          },
          tags: {
            include: {
              steamTag: true
            }
          },
          revenueEstimates: {
            orderBy: {
              calculatedAt: "desc"
            },
            take: 1
          }
        }
      }
    }
  },
  gdds: {
    orderBy: {
      version: "desc"
    }
  },
  artAnalysis: true,
  artAssets: {
    orderBy: {
      createdAt: "desc"
    }
  },
  milestones: {
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "asc" }
    ]
  },
  budgets: {
    orderBy: {
      createdAt: "desc"
    },
    include: {
      lines: {
        orderBy: [
          { dueAt: "asc" },
          { createdAt: "desc" }
        ]
      }
    }
  },
  revenueEntries: {
    orderBy: {
      receivedAt: "desc"
    }
  },
  expenseEntries: {
    orderBy: {
      occurredAt: "desc"
    }
  },
  approvalRequests: {
    orderBy: {
      createdAt: "desc"
    },
    take: 20
  },
  kanbanBoards: {
    orderBy: {
      createdAt: "asc"
    },
    include: {
      columns: {
        orderBy: {
          sortOrder: "asc"
        },
        include: {
          cards: {
            orderBy: {
              sortOrder: "asc"
            }
          }
        }
      }
    }
  }
} satisfies Prisma.ProjectInclude;

export async function createProject(params: {
  organizationId: string;
  workspaceId: string;
  createdById: string;
  name: string;
  stage?: ProjectStage;
  elevatorPitch?: string;
  description?: string;
  genreInput?: string;
  tagInput?: string;
  targetAudience?: string;
  coreLoop?: string;
  differentiator?: string;
  monetizationModel?: string;
  artDirection?: string;
  playerFantasy?: string;
  pricePointCents?: number | null;
}) {
  await assertCanUseFeature({
    userId: params.createdById,
    workspaceId: params.workspaceId,
    organizationId: params.organizationId
  }, "gameBoard");
  await assertCurrentUsageWithinLimit({
    userId: params.createdById,
    workspaceId: params.workspaceId,
    organizationId: params.organizationId
  }, "gameBoardProjects");
  await enforceSubscriptionCapacity(params.organizationId, "projects");

  const projectSlug = await buildUniqueSlug(slugify(params.name), async (slug) => {
    const count = await db.project.count({
      where: {
        workspaceId: params.workspaceId,
        slug
      }
    });

    return count > 0;
  });

  const project = await db.project.create({
    data: {
      organizationId: params.organizationId,
      workspaceId: params.workspaceId,
      createdById: params.createdById,
      name: params.name.trim(),
      slug: projectSlug,
      elevatorPitch: encryptProjectField(params.elevatorPitch, params.organizationId, params.workspaceId, "elevatorPitch"),
      description: encryptProjectField(params.description, params.organizationId, params.workspaceId, "description"),
      genreInput: encryptProjectField(params.genreInput, params.organizationId, params.workspaceId, "genreInput"),
      tagInput: encryptProjectField(params.tagInput, params.organizationId, params.workspaceId, "tagInput"),
      targetAudience: encryptProjectField(params.targetAudience, params.organizationId, params.workspaceId, "targetAudience"),
      coreLoop: encryptProjectField(params.coreLoop, params.organizationId, params.workspaceId, "coreLoop"),
      differentiator: encryptProjectField(params.differentiator, params.organizationId, params.workspaceId, "differentiator"),
      monetizationModel: encryptProjectField(params.monetizationModel, params.organizationId, params.workspaceId, "monetizationModel"),
      artDirection: encryptProjectField(params.artDirection, params.organizationId, params.workspaceId, "artDirection"),
      playerFantasy: encryptProjectField(params.playerFantasy, params.organizationId, params.workspaceId, "playerFantasy"),
      pricePointCents: params.pricePointCents ?? null,
      stage: params.stage ?? ProjectStage.DISCOVERY,
      kanbanBoards: {
        create: {
          name: "Production board",
          columns: {
            create: defaultKanbanColumns.map((column, index) => ({
              name: column.name,
              color: column.color,
              sortOrder: index
            }))
          }
        }
      }
    },
    include: projectInclude
  });

  await notifyOrganizationDiscordWebhook(params.organizationId, {
    content: `Project **${project.name}** was created in Neolytics.`,
    embeds: [
      {
        title: "Project created",
        description: `A new project has been opened in the product planning system.`,
        color: 3447003,
        fields: [
          {
            name: "Stage",
            value: project.stage,
            inline: true
          },
          {
            name: "Workspace",
            value: params.workspaceId,
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  });

  return hydrateProjectArtAssets(decryptProject(project));
}

export async function listProjects(workspaceId: string) {
  const projects = await db.project.findMany({
    where: {
      workspaceId
    },
    include: {
      analysis: true,
      gdds: {
        orderBy: {
          version: "desc"
        },
        take: 1
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return projects.map(decryptProject);
}

export async function getProjectById(projectId: string, workspaceId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      workspaceId
    },
    include: projectInclude
  });

  if (!project) {
    return null;
  }

  const members = await db.organizationMember.findMany({
    where: {
      organizationId: project.organizationId
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      }
    },
    orderBy: {
      joinedAt: "asc"
    }
  });

  return {
    ...hydrateProjectArtAssets(decryptProject(project)),
    assigneeOptions: members.map((member) => ({
      id: member.user.id,
      label: member.user.name?.trim() ? `${member.user.name.trim()} - ${member.user.email}` : member.user.email,
      email: member.user.email,
      image: member.user.image
    }))
  };
}

export async function updateProject(params: {
  projectId: string;
  workspaceId: string;
  name?: string;
  elevatorPitch?: string | null;
  description?: string | null;
  genreInput?: string | null;
  tagInput?: string | null;
  targetAudience?: string | null;
  coreLoop?: string | null;
  differentiator?: string | null;
  monetizationModel?: string | null;
  artDirection?: string | null;
  playerFantasy?: string | null;
  pricePointCents?: number | null;
  stage?: ProjectStage;
}) {
  const existing = await db.project.findFirstOrThrow({
    where: {
      id: params.projectId,
      workspaceId: params.workspaceId
    }
  });

  let slug = existing.slug;

  if (params.name && params.name.trim() !== existing.name) {
    slug = await buildUniqueSlug(slugify(params.name), async (candidate) => {
      const count = await db.project.count({
        where: {
          workspaceId: params.workspaceId,
          slug: candidate,
          NOT: {
            id: params.projectId
          }
        }
      });

      return count > 0;
    });
  }

  const data: Prisma.ProjectUpdateInput = {
    slug
  };

  if (params.name !== undefined) {
    data.name = params.name.trim();
  }

  if (params.elevatorPitch !== undefined) {
    data.elevatorPitch = encryptProjectField(params.elevatorPitch, existing.organizationId, existing.workspaceId, "elevatorPitch");
  }

  if (params.description !== undefined) {
    data.description = encryptProjectField(params.description, existing.organizationId, existing.workspaceId, "description");
  }

  if (params.genreInput !== undefined) {
    data.genreInput = encryptProjectField(params.genreInput, existing.organizationId, existing.workspaceId, "genreInput");
  }

  if (params.tagInput !== undefined) {
    data.tagInput = encryptProjectField(params.tagInput, existing.organizationId, existing.workspaceId, "tagInput");
  }

  if (params.targetAudience !== undefined) {
    data.targetAudience = encryptProjectField(params.targetAudience, existing.organizationId, existing.workspaceId, "targetAudience");
  }

  if (params.coreLoop !== undefined) {
    data.coreLoop = encryptProjectField(params.coreLoop, existing.organizationId, existing.workspaceId, "coreLoop");
  }

  if (params.differentiator !== undefined) {
    data.differentiator = encryptProjectField(params.differentiator, existing.organizationId, existing.workspaceId, "differentiator");
  }

  if (params.monetizationModel !== undefined) {
    data.monetizationModel = encryptProjectField(params.monetizationModel, existing.organizationId, existing.workspaceId, "monetizationModel");
  }

  if (params.artDirection !== undefined) {
    data.artDirection = encryptProjectField(params.artDirection, existing.organizationId, existing.workspaceId, "artDirection");
  }

  if (params.playerFantasy !== undefined) {
    data.playerFantasy = encryptProjectField(params.playerFantasy, existing.organizationId, existing.workspaceId, "playerFantasy");
  }

  if (params.pricePointCents !== undefined) {
    data.pricePointCents = params.pricePointCents;
  }

  if (params.stage !== undefined) {
    data.stage = params.stage;
  }

  const project = await db.project.update({
    where: {
      id: params.projectId
    },
    data,
    include: projectInclude
  });

  return hydrateProjectArtAssets(decryptProject(project));
}

export async function analyzeProject(projectId: string, workspaceId: string, userId: string) {
  const project = decryptProject(await db.project.findFirstOrThrow({
    where: {
      id: projectId,
      workspaceId
    }
  }));

  const entitlementContext = {
    userId,
    workspaceId,
    organizationId: project.organizationId
  };

  await assertCanUseFeature(entitlementContext, "viabilityAnalysis");
  await assertCurrentUsageWithinLimit(entitlementContext, "viabilityAnalysesPerMonth");
  const steamCoverage = await ensureProjectSteamCoverage(project);
  const matchingGames = await getComparableGames(project);
  const { genreTokens: projectGenres, tagTokens: projectTags } = await getProjectSignalSlugs(project);
  const projectKeywords = getProjectKeywords(project);
  const now = Date.now();
  const enrichedGames = matchingGames.map((game) => {
    const gameGenres = game.genres.map((genre) => genre.steamGenre.slug);
    const gameTags = game.tags.map((tag) => tag.steamTag.slug);
    const genreMatches = gameGenres.filter((genre) => projectGenres.includes(genre)).length;
    const tagMatches = gameTags.filter((tag) => projectTags.includes(tag)).length;
    const genreCoverage = projectGenres.length > 0 ? genreMatches / projectGenres.length : 0;
    const tagCoverage = projectTags.length > 0 ? tagMatches / projectTags.length : 0;
    const textSimilarityScore = getGameTextSimilarity(projectKeywords, game);
    const projectNameTokens = slugify(project.name).split("-").filter((token) => token.length >= 3);
    const nameMatches = projectNameTokens.filter((token) => game.name.toLowerCase().includes(token)).length;
    const similarityScore = clampScore(
      genreCoverage * 28
      + tagCoverage * 34
      + textSimilarityScore * 0.34
      + Math.min(12, nameMatches * 4)
      + (project.pricePointCents && game.priceCurrent?.finalPriceCents
        ? Math.max(0, 8 - (Math.abs(project.pricePointCents - game.priceCurrent.finalPriceCents) / Math.max(project.pricePointCents, 1)) * 8)
        : 0)
    );

    return {
      ...game,
      similarityScore,
      genreMatches,
      tagMatches,
      textSimilarityScore,
      isDirectComparable: similarityScore >= 48 || (textSimilarityScore >= 45 && (genreMatches > 0 || tagMatches > 0))
    };
  });
  const relevantGames = enrichedGames
    .filter((game) => game.similarityScore >= 14 || game.genreMatches > 0 || game.tagMatches > 0)
    .sort((left, right) => right.similarityScore - left.similarityScore || (right.reviewCount ?? 0) - (left.reviewCount ?? 0))
    .slice(0, 60);
  const directComparables = relevantGames
    .filter((game) => game.isDirectComparable)
    .sort((left, right) => right.similarityScore - left.similarityScore || (right.reviewCount ?? 0) - (left.reviewCount ?? 0));
  const adjacentComparables = relevantGames
    .filter((game) => !game.isDirectComparable && game.similarityScore >= 20)
    .sort((left, right) => right.similarityScore - left.similarityScore || (right.reviewCount ?? 0) - (left.reviewCount ?? 0));
  const rankedComparables = [...directComparables, ...adjacentComparables];
  const competitionCount = rankedComparables.length;
  const topCompetitors = rankedComparables.slice(0, 6);
  const revenueValues = rankedComparables
    .map((game) => revenueToNumber(game.revenueEstimates[0]?.medianNetRevenueCents))
    .filter((value) => value > 0);
  const directRevenueValues = directComparables
    .map((game) => revenueToNumber(game.revenueEstimates[0]?.medianNetRevenueCents))
    .filter((value) => value > 0);
  const priceValues = rankedComparables
    .map((game) => game.priceCurrent?.finalPriceCents ?? 0)
    .filter((value) => value > 0);
  const reviewValues = rankedComparables
    .map((game) => game.reviewScore ?? 0)
    .filter((value) => value > 0);
  const releaseMomentum = rankedComparables.filter((game) => {
    if (!game.releaseDate) {
      return false;
    }

    const ageInDays = (now - game.releaseDate.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays <= 365;
  }).length;
  const launches90 = rankedComparables.filter((game) => {
    if (!game.releaseDate) {
      return false;
    }

    return now - game.releaseDate.getTime() <= 90 * 24 * 60 * 60 * 1000;
  }).length;
  const launches180 = rankedComparables.filter((game) => {
    if (!game.releaseDate) {
      return false;
    }

    return now - game.releaseDate.getTime() <= 180 * 24 * 60 * 60 * 1000;
  }).length;
  const launches365 = releaseMomentum;
  const matchingIds = rankedComparables.map((game) => game.id);
  const [reviewSnapshots, playerSnapshots] = matchingIds.length > 0
    ? await Promise.all([
        db.steamReviewSnapshot.findMany({
          where: {
            steamGameId: {
              in: matchingIds
            },
            snapshotDate: {
              gte: new Date(now - 180 * 24 * 60 * 60 * 1000)
            }
          },
          orderBy: {
            snapshotDate: "asc"
          },
          select: {
            steamGameId: true,
            snapshotDate: true,
            totalReviews: true
          }
        }),
        db.steamPlayerCountSnapshot.findMany({
          where: {
            steamGameId: {
              in: matchingIds
            },
            snapshotDate: {
              gte: new Date(now - 60 * 24 * 60 * 60 * 1000)
            }
          },
          orderBy: {
            snapshotDate: "asc"
          },
          select: {
            steamGameId: true,
            snapshotDate: true,
            currentPlayers: true
          }
        })
      ])
    : [[], []];
  const reviewVelocity = getReviewVelocity(reviewSnapshots);
  const playerMomentum = getPlayerMomentum(playerSnapshots);
  const medianRevenueCents = median(revenueValues);
  const p75RevenueCents = percentile(directRevenueValues.length > 0 ? directRevenueValues : revenueValues, 0.75);
  const totalRevenueCents = sum(revenueValues);
  const averagePriceCents = priceValues.length > 0 ? Math.round(average(priceValues)) : null;
  const medianPriceCents = priceValues.length > 0 ? median(priceValues) : 0;
  const averageReviewScore = reviewValues.length > 0 ? Number(average(reviewValues).toFixed(1)) : null;
  const top3Revenue = sum([...revenueValues].sort((left, right) => right - left).slice(0, 3));
  const revenueConcentrationPercent = totalRevenueCents > 0 ? Math.round((top3Revenue / totalRevenueCents) * 100) : 0;
  const qualityBarScore = reviewValues.length > 0 ? clampScore(percentile(reviewValues, 0.75)) : 0;
  const priceBandDistribution = getPriceBandDistribution(priceValues);
  const dominantMonetization = getDominantMonetization(project, rankedComparables);
  const coverageChecks = [
    revenueValues.length >= Math.max(3, Math.floor(competitionCount * 0.35)),
    priceValues.length >= Math.max(3, Math.floor(competitionCount * 0.5)),
    reviewValues.length >= Math.max(3, Math.floor(competitionCount * 0.6)),
    reviewVelocity.coveredGames >= Math.max(2, Math.floor(competitionCount * 0.25)),
    playerMomentum.coveredSamples > 0
  ];
  const confidenceScore = clampScore((coverageChecks.filter(Boolean).length / coverageChecks.length) * 100);
  const launchDensityScore = competitionCount > 0 ? clampScore((launches180 / competitionCount) * 100) : 0;
  const crowdednessScore = clampScore(
    directComparables.length * 8
    + (competitionCount - directComparables.length) * 2
    + launchDensityScore * 0.2
  );
  const revenuePotentialScore = clampScore(
    (medianRevenueCents > 0 ? Math.min(45, medianRevenueCents / 4_000_000) : 0)
    + (p75RevenueCents > 0 ? Math.min(35, p75RevenueCents / 10_000_000) : 0)
    + (reviewVelocity.reviewVelocity90 > 0 ? Math.min(20, reviewVelocity.reviewVelocity90 / 25) : 0)
  );
  const underservedScore = clampScore(
    revenuePotentialScore * 0.35
    + Math.max(0, 100 - crowdednessScore) * 0.35
    + Math.max(0, 100 - revenueConcentrationPercent) * 0.15
    + Math.min(20, reviewVelocity.reviewVelocity90 / 20) * 0.15
  );
  const executionBarScore = clampScore(
    qualityBarScore * 0.6
    + revenueConcentrationPercent * 0.15
    + crowdednessScore * 0.25
  );
  const riskScore = clampScore(
    Math.max(0, 100 - (averageReviewScore ?? 0)) * 0.3
    + revenueConcentrationPercent * 0.25
    + crowdednessScore * 0.25
    + (reviewVelocity.reviewVelocity90 < reviewVelocity.previousReviewVelocity90 ? 12 : 0)
    + (playerMomentum.playerMomentum30 < playerMomentum.previousPlayerMomentum30 ? 8 : 0)
  );
  const opportunityScore = clampScore(
    revenuePotentialScore * 0.35
    + underservedScore * 0.3
    + Math.max(0, 100 - riskScore) * 0.2
    + Math.max(0, 100 - crowdednessScore) * 0.15
  );
  const priceFitScore = project.pricePointCents && medianPriceCents > 0
    ? clampScore(100 - (Math.abs(project.pricePointCents - medianPriceCents) / medianPriceCents) * 100)
    : 60;
  const genreTagCoverageScore = clampScore(average(directComparables.slice(0, 5).map((game) => game.similarityScore)));
  const positioningClarityScore = clampScore(
    [
      project.elevatorPitch,
      project.description,
      project.targetAudience,
      project.coreLoop,
      project.differentiator,
      project.playerFantasy
    ].filter((value) => value?.trim()).length * 16
  );
  const overallFitScore = clampScore(
    genreTagCoverageScore * 0.35
    + priceFitScore * 0.2
    + dominantMonetization.fitScore * 0.2
    + positioningClarityScore * 0.25
  );
  const marketDepth = {
    marketSizeCents: totalRevenueCents,
    marketSizeLabel: getMarketSizeLabel(totalRevenueCents),
    reviewVelocity90: reviewVelocity.reviewVelocity90,
    previousReviewVelocity90: reviewVelocity.previousReviewVelocity90,
    playerMomentum30: Math.round(playerMomentum.playerMomentum30),
    previousPlayerMomentum30: Math.round(playerMomentum.previousPlayerMomentum30),
    priceBandDistribution,
    launchCohorts: {
      last90Days: launches90,
      last180Days: launches180,
      last365Days: launches365
    },
    revenueConcentrationPercent,
    confidenceScore,
    confidenceLabel: getConfidenceLabel(confidenceScore)
  };
  const competitionLayer = {
    directComparableCount: directComparables.length,
    adjacentComparableCount: adjacentComparables.length,
    crowdednessScore,
    winnerConcentrationScore: revenueConcentrationPercent,
    qualityBarScore,
    dominantMonetization: dominantMonetization.dominant,
    premiumSharePercent: competitionCount > 0 ? Math.round((rankedComparables.filter((game) => !game.isFree).length / competitionCount) * 100) : 0,
    directComparableNames: directComparables.slice(0, 6).map((game) => game.name),
    adjacentComparableNames: adjacentComparables.slice(0, 6).map((game) => game.name)
  };
  const projectFitLayer = {
    genreTagCoverageScore,
    priceFitScore,
    monetizationFitScore: dominantMonetization.fitScore,
    positioningClarityScore,
    overallFitScore
  };
  const hybridMarketIntelligence = buildHybridMarketIntelligence({
    project,
    rankedComparables,
    directComparables,
    adjacentComparables,
    reviewSnapshots,
    playerSnapshots,
    medianPriceCents,
    averageReviewScore,
    revenueConcentrationPercent,
    premiumSharePercent: competitionLayer.premiumSharePercent,
    confidenceScore,
    confidenceLabel: marketDepth.confidenceLabel
  });
  const keyMismatches = [
    priceFitScore < 55 && medianPriceCents > 0
      ? `Your target price is misaligned with the segment median of ${formatMoney(medianPriceCents)}.`
      : null,
    dominantMonetization.fitScore < 55
      ? `Your monetization approach does not match the dominant ${dominantMonetization.dominant} pattern in this segment.`
      : null,
    positioningClarityScore < 60
      ? "The project pitch still lacks enough specificity around fantasy, audience, or differentiator."
      : null,
    genreTagCoverageScore < 50
      ? "The current genre/tag framing is still weak relative to the strongest direct comparables."
      : null
  ].filter((item): item is string => Boolean(item));
  const practicalRecommendations = [
    revenueConcentrationPercent >= 65
      ? "Design the store hook to beat a concentrated winner-led market rather than assuming broad mid-tail demand."
      : "There is enough spread below the category leaders to target a clearer mid-market position.",
    launchDensityScore >= 45
      ? "Recent launch density is high, so timing and positioning should be treated as first-order strategic decisions."
      : "Launch density is manageable, which gives you more room to choose a timing window deliberately.",
    qualityBarScore >= 85
      ? "This segment expects a very high review bar, so polish and onboarding quality will matter almost as much as concept."
      : "The quality bar is solid but not impossible, so a sharper value proposition can still do real work."
  ];
  const opportunityLayer = {
    underservedScore,
    revenuePotentialScore,
    opportunityScore,
    riskScore,
    executionBarScore,
    practicalRecommendations,
    keyMismatches,
    probabilisticClassification: hybridMarketIntelligence.probabilisticAssessment.classification,
    quantitativeOpportunityScore: hybridMarketIntelligence.opportunityScoring.score,
    discoverabilityDifficulty: hybridMarketIntelligence.probabilisticAssessment.probabilities.discoverabilityDifficulty
  };
  const opportunitySummary = [
    hybridMarketIntelligence.probabilisticAssessment.conclusion,
    `The weighted model rates demand at ${hybridMarketIntelligence.probabilisticAssessment.probabilities.nicheDemand}/100, growth potential at ${hybridMarketIntelligence.probabilisticAssessment.probabilities.growthPotential}/100, and oversaturation at ${hybridMarketIntelligence.probabilisticAssessment.probabilities.oversaturation}/100.`,
    opportunityScore >= 70
      ? `This looks like a commercially active segment with enough room for a sharply positioned entrant.`
      : `The opportunity is conditional on stronger positioning and better evidence before scaling budget.`
  ].join(" ");
  const riskSummary = [
    `Execution risk is ${hybridMarketIntelligence.probabilisticAssessment.probabilities.executionRisk}/100 and discoverability difficulty is ${hybridMarketIntelligence.probabilisticAssessment.probabilities.discoverabilityDifficulty}/100.`,
    riskScore >= 65
      ? `Risk is elevated because ${revenueConcentrationPercent >= 65 ? "a few winners dominate revenue capture" : "the niche still shows weak or unstable momentum"}, and the execution bar is ${executionBarScore >= 70 ? "high" : "non-trivial"}.`
      : `Risk is manageable for a disciplined team. The main challenge is outperforming the current quality bar rather than entering a structurally broken segment.`
  ].join(" ");
  const marketSummary = [
    `${directComparables.length} direct comparables and ${adjacentComparables.length} adjacent comps were identified from the current Steam dataset.`,
    steamCoverage.discoveredAppIds.length > 0 ? `Steam Store search added ${steamCoverage.discoveredAppIds.length} candidate app ids from project-specific queries before ranking.` : "No extra Steam Store search candidates were found for the project-specific queries.",
    totalRevenueCents > 0 ? `The tracked market depth looks ${marketDepth.marketSizeLabel.toLowerCase()}, with roughly ${formatMoney(totalRevenueCents)} in cumulative estimated net revenue across the matched set and a median of ${formatMoney(medianRevenueCents)}.` : "Revenue coverage is still thin, so the market sizing layer should be treated cautiously.",
    reviewVelocity.reviewVelocity90 > 0 ? `Review velocity added ${reviewVelocity.reviewVelocity90.toLocaleString("en-US")} reviews in the last 90 days versus ${reviewVelocity.previousReviewVelocity90.toLocaleString("en-US")} in the prior window.` : "Temporal review coverage is still limited, so momentum should be treated as directional rather than conclusive.",
    launches365 > 0 ? `${launches365} comparable launches landed in the last 12 months, with ${launches90} arriving in the last 90 days.` : "Recent launch activity is quiet in this segment.",
    `The non-AI model classifies this as: ${hybridMarketIntelligence.probabilisticAssessment.classification}.`
  ].join(" ");
  const suggestedGenres = Array.from(
    new Set(topCompetitors.flatMap((game) => game.genres.map((genre) => genre.steamGenre.name)))
  ).slice(0, 5);
  const suggestedTags = Array.from(
    new Set(topCompetitors.flatMap((game) => game.tags.map((tag) => tag.steamTag.name)))
  ).slice(0, 8);
  const audienceAutofill = project.targetAudience?.trim()
    || `Players who buy ${suggestedGenres.slice(0, 2).join(" / ") || "genre"} games on Steam and respond to a clearly signaled fantasy plus an immediately legible progression loop.`;
  const coreLoopAutofill = project.coreLoop?.trim()
    || `Center the loop around ${suggestedTags.slice(0, 3).join(", ") || "clear mastery signals"} with visible retention hooks and a short path to the game's core fantasy.`;
  const differentiators = [
    project.differentiator?.trim(),
    crowdednessScore >= 65 ? "The positioning hook must be visible in the first few seconds of store exposure because the direct shelf is crowded." : "There is room to win with a more focused concept if the store fantasy lands cleanly.",
    priceFitScore < 60 && medianPriceCents > 0 ? `Revisit pricing toward the segment center around ${formatMoney(medianPriceCents)} unless scope clearly justifies the gap.` : null,
     dominantMonetization.fitScore < 55 ? `Clarify why your monetization model should outperform the segment's ${dominantMonetization.dominant} baseline.` : null
  ].filter((item): item is string => Boolean(item));
  const aiLayer = await generateAiProjectMarketAnalysis({
    project: {
      name: project.name,
      elevatorPitch: project.elevatorPitch,
      description: project.description,
      genreInput: project.genreInput,
      tagInput: project.tagInput,
      targetAudience: project.targetAudience,
      coreLoop: project.coreLoop,
      differentiator: project.differentiator,
      monetizationModel: project.monetizationModel,
      playerFantasy: project.playerFantasy,
      pricePointCents: project.pricePointCents
    },
    market: {
      matchingGamesCount: matchingGames.length,
      directComparableCount: directComparables.length,
      adjacentComparableCount: adjacentComparables.length,
      marketSizeLabel: marketDepth.marketSizeLabel,
      marketSizeCents: totalRevenueCents,
      medianRevenueCents,
      averageReviewScore,
      medianPriceCents,
      crowdednessScore,
      revenueConcentrationPercent,
      confidenceScore,
      confidenceLabel: marketDepth.confidenceLabel,
      opportunityScore,
      riskScore,
      executionBarScore,
      reviewVelocity90: reviewVelocity.reviewVelocity90,
      previousReviewVelocity90: reviewVelocity.previousReviewVelocity90,
      playerMomentum30: Math.round(playerMomentum.playerMomentum30),
      previousPlayerMomentum30: Math.round(playerMomentum.previousPlayerMomentum30),
      launches90,
      launches180,
      launches365,
      dominantMonetization: dominantMonetization.dominant,
      premiumSharePercent: competitionLayer.premiumSharePercent,
      practicalRecommendations,
      keyMismatches,
      directComparables: directComparables.slice(0, 8).map((game) => ({
        name: game.name,
        reviewScore: game.reviewScore,
        reviewCount: game.reviewCount,
        priceCents: game.priceCurrent?.finalPriceCents ?? null,
        medianRevenueCents: revenueToNumber(game.revenueEstimates[0]?.medianNetRevenueCents),
        genres: game.genres.map((genre) => genre.steamGenre.name),
        tags: game.tags.map((tag) => tag.steamTag.name)
      })),
      adjacentComparables: adjacentComparables.slice(0, 8).map((game) => ({
        name: game.name,
        reviewScore: game.reviewScore,
        reviewCount: game.reviewCount,
        priceCents: game.priceCurrent?.finalPriceCents ?? null,
        medianRevenueCents: revenueToNumber(game.revenueEstimates[0]?.medianNetRevenueCents),
        genres: game.genres.map((genre) => genre.steamGenre.name),
        tags: game.tags.map((tag) => tag.steamTag.name)
      }))
    }
  });
  const finalMarketSummary = aiLayer?.marketSummary
    ? `${marketSummary} AI strategy layer: ${aiLayer.marketSummary}`
    : marketSummary;
  const finalOpportunitySummary = aiLayer?.opportunitySummary
    ? `${opportunitySummary} AI strategy layer: ${aiLayer.opportunitySummary}`
    : opportunitySummary;
  const finalRiskSummary = aiLayer?.riskSummary
    ? `${riskSummary} AI strategy layer: ${aiLayer.riskSummary}`
    : riskSummary;
  const finalAudienceAutofill = aiLayer?.audienceAutofill || audienceAutofill;
  const finalCoreLoopAutofill = aiLayer?.coreLoopAutofill || coreLoopAutofill;
  const analysisMetadata = {
    topCompetitorIds: topCompetitors.map((game) => game.id),
    topCompetitorNames: topCompetitors.map((game) => game.name),
    steamCoverage,
    projectSignals: {
      keywords: projectKeywords,
      genreSlugs: projectGenres,
      tagSlugs: projectTags
    },
    marketDepth,
    competitionLayer,
    opportunityLayer,
    projectFitLayer,
    hybridMarketIntelligence,
    aiLayer
  } as unknown as Prisma.InputJsonObject;

  await db.project.update({
    where: {
      id: project.id
    },
    data: {
      targetAudience: project.targetAudience?.trim() || finalAudienceAutofill,
      coreLoop: project.coreLoop?.trim() || finalCoreLoopAutofill,
      differentiator: project.differentiator?.trim() || differentiators[0] || null,
      genreInput: project.genreInput?.trim() || (suggestedGenres.length > 0 ? suggestedGenres.join(", ") : null),
      tagInput: project.tagInput?.trim() || (suggestedTags.length > 0 ? suggestedTags.join(", ") : null)
    }
  });

  const analysis = await db.projectAnalysis.upsert({
    where: {
      projectId: project.id
    },
    update: {
      analyzedAt: new Date(),
      matchingGamesCount: matchingGames.length,
      competitionCount,
      releaseMomentum,
      averageReviewScore,
      averagePriceCents,
      medianRevenueCents: BigInt(medianRevenueCents),
      marketSummary: finalMarketSummary,
      opportunitySummary: finalOpportunitySummary,
      riskSummary: finalRiskSummary,
      audienceAutofill: finalAudienceAutofill,
      coreLoopAutofill: finalCoreLoopAutofill,
      suggestedGenres,
      suggestedTags,
      differentiators,
      metadata: analysisMetadata
    },
    create: {
      projectId: project.id,
      matchingGamesCount: matchingGames.length,
      competitionCount,
      releaseMomentum,
      averageReviewScore,
      averagePriceCents,
      medianRevenueCents: BigInt(medianRevenueCents),
      marketSummary: finalMarketSummary,
      opportunitySummary: finalOpportunitySummary,
      riskSummary: finalRiskSummary,
      audienceAutofill: finalAudienceAutofill,
      coreLoopAutofill: finalCoreLoopAutofill,
      suggestedGenres,
      suggestedTags,
      differentiators,
      metadata: analysisMetadata
    }
  });

  await db.$transaction([
    db.projectCompetitorGame.deleteMany({
      where: {
        projectId: project.id
      }
    }),
    ...topCompetitors.map((game) => db.projectCompetitorGame.create({
      data: {
        projectId: project.id,
        steamGameId: game.id
      }
    }))
  ]);

  const result = await db.project.findUniqueOrThrow({
    where: {
      id: project.id
    },
    include: projectInclude
  });

  await notifyOrganizationDiscordWebhook(project.organizationId, {
    content: `Market analysis was refreshed for **${project.name}**.`,
    embeds: [
      {
        title: "Project analysis completed",
        description: `Competition count: ${competitionCount}. Release momentum: ${releaseMomentum}.`,
        color: 10181046,
        fields: [
          {
            name: "Opportunity score",
            value: String(opportunityScore),
            inline: true
          },
          {
            name: "Risk score",
            value: String(riskScore),
            inline: true
          },
          {
            name: "Median revenue",
            value: medianRevenueCents > 0
              ? (medianRevenueCents / 100).toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0
                })
              : "No coverage yet",
            inline: true
          },
          {
            name: "Review score",
            value: averageReviewScore ? `${averageReviewScore.toFixed(1)}%` : "No coverage yet",
            inline: true
          },
          {
            name: "Confidence",
            value: `${marketDepth.confidenceLabel} (${confidenceScore})`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  });

  await recordSubscriptionUsage(project.organizationId, "projectAnalysesRun");
  await recordUsage(entitlementContext, {
    featureKey: "viabilityAnalysis",
    limitKey: "viabilityAnalysesPerMonth",
    metadata: {
      projectId: project.id
    }
  });

  return hydrateProjectArtAssets(decryptProject(result));
}

export async function analyzeProjectArt(projectId: string, workspaceId: string, userId: string) {
  const project = decryptProject(await db.project.findFirstOrThrow({
    where: {
      id: projectId,
      workspaceId
    }
  }));
  const artAssets = await db.projectArtAsset.findMany({
    where: {
      projectId: project.id
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const entitlementContext = {
    userId,
    workspaceId,
    organizationId: project.organizationId
  };

  await assertCanUseFeature(entitlementContext, "artAnalysis");
  await assertCurrentUsageWithinLimit(entitlementContext, "artAnalysesPerMonth");
  const organization = await db.organization.findUniqueOrThrow({
    where: {
      id: project.organizationId
    },
    select: {
      subscriptionPlan: true
    }
  });

  const matchingGames = await getComparableGames(project);
  const topCompetitors = matchingGames.slice(0, 6);
  const competitionCount = matchingGames.length;
  const averageReviewScore = matchingGames.length > 0
    ? matchingGames
        .map((game) => game.reviewScore ?? 0)
        .filter((value) => value > 0)
        .reduce((sum, value, _, values) => sum + value / values.length, 0)
    : 0;
  const averagePriceCents = matchingGames.length > 0
    ? median(
        matchingGames
          .map((game) => game.priceCurrent?.finalPriceCents ?? 0)
          .filter((value) => value > 0)
      )
    : 0;
  const releaseMomentum = matchingGames.filter((game) => {
    if (!game.releaseDate) {
      return false;
    }

    const ageInDays = (Date.now() - game.releaseDate.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays <= 365;
  }).length;
  const measuredAssets = artAssets.filter((asset) => asset.width && asset.height);
  const highResolutionAssets = measuredAssets.filter((asset) => (asset.width ?? 0) >= 1280 && (asset.height ?? 0) >= 720);
  const capsuleRatioAssets = measuredAssets.filter((asset) => {
    const ratio = (asset.width ?? 1) / (asset.height ?? 1);
    return ratio >= 1.5 && ratio <= 2.2;
  });
  const squareAssets = measuredAssets.filter((asset) => {
    const ratio = (asset.width ?? 1) / (asset.height ?? 1);
    return ratio >= 0.85 && ratio <= 1.15;
  });
  const assetsWithVisualMetrics = artAssets
    .map((asset) => asset.visualMetrics)
    .filter((metrics): metrics is {
      brightness: number;
      contrast: number;
      saturation: number;
      colorfulness: number;
      edgeDensity: number;
      dominantColor: string;
      readabilityScore: number;
      legibilityRisk: "low" | "medium" | "high";
      analysisSource: string;
    } => {
      if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
        return false;
      }

      return typeof metrics.readabilityScore === "number"
        && typeof metrics.contrast === "number"
        && typeof metrics.saturation === "number";
    });
  const averageReadabilityScore = average(assetsWithVisualMetrics.map((metrics) => metrics.readabilityScore));
  const averageContrast = average(assetsWithVisualMetrics.map((metrics) => metrics.contrast));
  const averageSaturation = average(assetsWithVisualMetrics.map((metrics) => metrics.saturation));
  const averageEdgeDensity = average(assetsWithVisualMetrics.map((metrics) => metrics.edgeDensity));
  const highLegibilityRiskAssets = assetsWithVisualMetrics.filter((metrics) => metrics.legibilityRisk === "high").length;
  const dominantColors = [...new Set(assetsWithVisualMetrics.map((metrics) => metrics.dominantColor))].slice(0, 6);
  const artAssetEvidenceScore = clampScore(
    artAssets.length * 9
    + measuredAssets.length * 8
    + highResolutionAssets.length * 7
    + capsuleRatioAssets.length * 8
    + squareAssets.length * 5
    + assetsWithVisualMetrics.length * 10
    + (averageReadabilityScore * 0.15)
  );
  const artText = [
    project.artDirection,
    project.description,
    project.elevatorPitch,
    project.playerFantasy,
    project.tagInput
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const paletteKeywords = Array.from(
    new Set(
      [
        artText.includes("neon") || artText.includes("cyber") ? "neon blue" : null,
        artText.includes("dark") || artText.includes("horror") ? "deep shadows" : null,
        artText.includes("fantasy") ? "enchanted glow" : null,
        artText.includes("cozy") ? "warm pastel" : null,
        artText.includes("pixel") ? "high-contrast sprite palette" : null,
        competitionCount > 12 ? "store capsule contrast" : null,
        averageReviewScore >= 85 ? "premium finish" : "readability-first palette",
        averageContrast >= 58 ? "strong value contrast" : null,
        averageSaturation >= 55 ? "high-saturation colorway" : null,
        averageSaturation > 0 && averageSaturation < 28 ? "muted colorway" : null,
        dominantColors[0] ? `dominant ${dominantColors[0]}` : null
      ].filter((item): item is string => Boolean(item))
    )
  ).slice(0, 4);
  const moodKeywords = Array.from(
    new Set(
      [
        artText.includes("sci") || artText.includes("cyber") ? "futuristic" : null,
        artText.includes("dark") || artText.includes("horror") ? "tense" : null,
        artText.includes("cozy") ? "welcoming" : null,
        artText.includes("fantasy") ? "mythic" : null,
        artText.includes("pixel") ? "retro" : null,
        releaseMomentum > 8 ? "commercially active" : "niche-focused",
        competitionCount > 10 ? "crowded shelf" : "open shelf",
        averageReadabilityScore >= 72 ? "clear first read" : null,
        highLegibilityRiskAssets > 0 ? "readability risk" : null
      ].filter((item): item is string => Boolean(item))
    )
  ).slice(0, 5);
  const realismComplexity =
    (artText.includes("realistic") ? 22 : 0)
    + (artText.includes("cinematic") ? 14 : 0)
    + (artText.includes("detailed") ? 12 : 0)
    + (artText.includes("3d") ? 10 : 0)
    + (artText.includes("pixel") ? -10 : 0)
    + (artText.includes("minimal") ? -12 : 0)
    + (artText.includes("low poly") ? -8 : 0);
  const distinctivenessScore = clampScore(
    78
    + (project.artDirection?.trim() ? 10 : -6)
    + (project.differentiator?.trim() ? 8 : 0)
    + (project.playerFantasy?.trim() ? 6 : 0)
    + (artAssetEvidenceScore * 0.12)
    + (averageReadabilityScore > 0 ? (averageReadabilityScore - 55) * 0.18 : 0)
    - (artAssets.length === 0 ? 12 : 0)
    - highLegibilityRiskAssets * 5
    - Math.min(competitionCount, 18) * 1.5,
    18,
    96
  );
  const productionComplexityScore = clampScore(
    45
    + realismComplexity
    + Math.min(highResolutionAssets.length * 3, 9)
    + Math.min(averageEdgeDensity * 0.25, 10)
    + (project.pricePointCents && project.pricePointCents >= 2999 ? 8 : 0)
    + (competitionCount > 15 ? 8 : 0)
  );
  const priceFitScore = project.pricePointCents && averagePriceCents > 0
    ? clampScore(100 - (Math.abs(project.pricePointCents - averagePriceCents) / averagePriceCents) * 100)
    : 60;
  const marketFitScore = clampScore(
    averageReviewScore * 0.55
    + priceFitScore * 0.25
    + (competitionCount > 0 ? (releaseMomentum / competitionCount) * 20 : 0)
    + (averageReadabilityScore > 0 ? (averageReadabilityScore - 60) * 0.12 : 0)
  );
  const visualTrendScore = clampScore(competitionCount > 0 ? (releaseMomentum / competitionCount) * 100 : 25);
  const styleSummary =
    artAssets.length > 0
      ? `${artAssets.length} uploaded art asset${artAssets.length === 1 ? "" : "s"} were reviewed. ${measuredAssets.length} have readable dimensions, ${capsuleRatioAssets.length} are close to Steam capsule/header ratios, and ${assetsWithVisualMetrics.length} were pixel-analyzed for contrast, saturation, visual density, and first-read clarity. Average readability is ${Math.round(averageReadabilityScore || 0)}/100, with ${highLegibilityRiskAssets} high-risk asset${highLegibilityRiskAssets === 1 ? "" : "s"}. Comparable Steam games currently suggest ${moodKeywords.slice(0, 2).join(" and ") || "clear visual positioning"} as the shelf baseline.`
      : topCompetitors.length > 0
      ? `Comparable Steam games currently cluster around ${moodKeywords.slice(0, 2).join(" and ") || "clear visual positioning"}, with ${paletteKeywords.slice(0, 2).join(" plus ") || "readable capsule contrast"} showing up as the strongest shelf signal.`
      : "The current dataset does not have enough comparable art references yet, so the visual brief should be treated as exploratory.";
  const fitSummary =
    artAssets.length === 0
      ? "No artwork has been uploaded yet, so this is still a visual-direction estimate rather than a true asset review."
      : marketFitScore >= 70
      ? "The proposed art direction is close to the current quality bar for this niche and should support commercial positioning if execution stays consistent."
      : "The current art direction thesis is still under-specified relative to the niche, so the market fit will depend heavily on sharpening readability, fantasy, and store presence.";
  const productionSummary =
    productionComplexityScore >= 70
      ? "This visual direction has a high production cost profile. Scope, outsourcing, and animation complexity need to be kept under tight control."
      : "This direction is commercially workable without blockbuster art scope, as long as the team keeps consistency high across key surfaces.";
  const recommendationSummary = [
    distinctivenessScore < 55 ? "Push a more ownable silhouette or color story before production lock." : "Keep the current visual hook and reinforce it in the capsule and hero scenes.",
    artAssets.length === 0 ? "Upload capsule art, key art, screenshots, or mood targets before treating this as a real art review." : null,
    artAssets.length > 0 && capsuleRatioAssets.length === 0 ? "Add at least one wide store-facing image so the analysis can judge Steam capsule/header readability." : null,
    highLegibilityRiskAssets > 0 ? "At least one uploaded asset has weak first-read clarity; increase value contrast, simplify noisy areas, or strengthen the focal silhouette." : null,
    averageSaturation > 72 ? "The uploaded palette is highly saturated; reserve the strongest color for the focal point so the capsule does not become visually flat." : null,
    priceFitScore < 55 ? `Your target price is drifting away from the niche median of ${(averagePriceCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}; align the finish bar or pricing.` : null,
    competitionCount > 12 ? "The shelf is crowded, so capsule readability and instant fantasy communication matter more than detail density." : "There is room to claim a stronger identity if the art direction lands cleanly."
  ]
    .filter((item): item is string => Boolean(item))
    .join(" ");
  const proArtBrief = organization.subscriptionPlan === SubscriptionPlan.PRO
    ? {
        capsuleReadinessScore: clampScore((distinctivenessScore * 0.45) + (marketFitScore * 0.35) + ((100 - productionComplexityScore) * 0.2)),
        shelfGapSummary:
          competitionCount > 12
            ? "The shelf is saturated enough that the art needs a harder first-read hook, not just better rendering polish."
            : "The shelf still leaves room for a clearer fantasy-first presentation if the team commits to a stronger silhouette and capsule hierarchy.",
        productionLevers: [
          productionComplexityScore >= 70 ? "Reduce high-cost finish work outside the capsule, hero, and first gameplay surfaces." : "Keep polish concentrated on the store-facing surfaces that carry the first commercial impression.",
          averagePriceCents >= 2499 ? "Support the target price with fewer but stronger hero environments and cleaner material definition." : "Use readability and fantasy clarity to outperform the lower price band without overbuilding assets.",
          competitionCount > 10 ? "Build a capsule-first review lane before scaling the full asset backlog." : "Lock a distinctive visual motif early, then scale production around that motif."
        ],
        referenceShelf: topCompetitors.slice(0, 3).map((game) => ({
          name: game.name,
          reviewScore: game.reviewScore ?? 0,
          priceCents: game.priceCurrent?.finalPriceCents ?? 0
        }))
      }
    : null;
  const aiArtAssets = await Promise.all(artAssets.slice(0, 4).map(async (asset) => ({
    kind: asset.kind,
    originalName: asset.originalName,
    width: asset.width,
    height: asset.height,
    notes: asset.notes,
    signedUrl: await createProjectArtAssetSignedUrl(asset.storagePath).catch(() => null),
    visualMetrics: asset.visualMetrics
  })));
  const aiArtLayer = await generateAiProjectArtAnalysis({
    project: {
      name: project.name,
      elevatorPitch: project.elevatorPitch,
      description: project.description,
      genreInput: project.genreInput,
      tagInput: project.tagInput,
      targetAudience: project.targetAudience,
      coreLoop: project.coreLoop,
      differentiator: project.differentiator,
      artDirection: project.artDirection,
      playerFantasy: project.playerFantasy,
      pricePointCents: project.pricePointCents
    },
    metrics: {
      assetCount: artAssets.length,
      measuredAssets: measuredAssets.length,
      highResolutionAssets: highResolutionAssets.length,
      capsuleRatioAssets: capsuleRatioAssets.length,
      squareAssets: squareAssets.length,
      pixelAnalyzedAssets: assetsWithVisualMetrics.length,
      averageReadabilityScore: Math.round(averageReadabilityScore || 0),
      averageContrast: Math.round(averageContrast || 0),
      averageSaturation: Math.round(averageSaturation || 0),
      averageEdgeDensity: Math.round(averageEdgeDensity || 0),
      highLegibilityRiskAssets,
      dominantColors,
      distinctivenessScore,
      productionComplexityScore,
      marketFitScore,
      visualTrendScore,
      referenceGameNames: topCompetitors.map((game) => game.name),
      paletteKeywords,
      moodKeywords
    },
    assets: aiArtAssets
  });

  await db.project.update({
    where: {
      id: project.id
    },
    data: {
      artDirection: encryptProjectField(
        project.artDirection || `Target a ${moodKeywords.slice(0, 2).join(" / ") || "market-readable"} visual profile with ${paletteKeywords.slice(0, 2).join(" and ") || "clear contrast"} as the strongest shelf signal.`,
        project.organizationId,
        project.workspaceId,
        "artDirection"
      )
    }
  });

  const artAnalysis = await db.projectArtAnalysis.upsert({
    where: {
      projectId: project.id
    },
    update: {
      analyzedAt: new Date(),
      distinctivenessScore,
      productionComplexityScore,
      marketFitScore,
      visualTrendScore,
      styleSummary,
      fitSummary,
      productionSummary,
      recommendationSummary,
      paletteKeywords,
      moodKeywords,
      metadata: {
        planLabel: organization.subscriptionPlan,
        referenceGameIds: topCompetitors.map((game) => game.id),
        referenceGameNames: topCompetitors.map((game) => game.name),
        uploadedArtAssets: {
          total: artAssets.length,
          measured: measuredAssets.length,
          highResolution: highResolutionAssets.length,
          capsuleRatio: capsuleRatioAssets.length,
          square: squareAssets.length,
          evidenceScore: artAssetEvidenceScore,
          pixelAnalyzed: assetsWithVisualMetrics.length,
          averageReadabilityScore: Math.round(averageReadabilityScore || 0),
          averageContrast: Math.round(averageContrast || 0),
          averageSaturation: Math.round(averageSaturation || 0),
          averageEdgeDensity: Math.round(averageEdgeDensity || 0),
          highLegibilityRisk: highLegibilityRiskAssets,
          dominantColors
        },
        aiArtLayer: aiArtLayer as Prisma.InputJsonValue | null,
        proArtBrief
      }
    },
    create: {
      projectId: project.id,
      distinctivenessScore,
      productionComplexityScore,
      marketFitScore,
      visualTrendScore,
      styleSummary,
      fitSummary,
      productionSummary,
      recommendationSummary,
      paletteKeywords,
      moodKeywords,
      metadata: {
        planLabel: organization.subscriptionPlan,
        referenceGameIds: topCompetitors.map((game) => game.id),
        referenceGameNames: topCompetitors.map((game) => game.name),
        uploadedArtAssets: {
          total: artAssets.length,
          measured: measuredAssets.length,
          highResolution: highResolutionAssets.length,
          capsuleRatio: capsuleRatioAssets.length,
          square: squareAssets.length,
          evidenceScore: artAssetEvidenceScore,
          pixelAnalyzed: assetsWithVisualMetrics.length,
          averageReadabilityScore: Math.round(averageReadabilityScore || 0),
          averageContrast: Math.round(averageContrast || 0),
          averageSaturation: Math.round(averageSaturation || 0),
          averageEdgeDensity: Math.round(averageEdgeDensity || 0),
          highLegibilityRisk: highLegibilityRiskAssets,
          dominantColors
        },
        aiArtLayer: aiArtLayer as Prisma.InputJsonValue | null,
        proArtBrief
      }
    }
  });

  const result = await db.project.findUniqueOrThrow({
    where: {
      id: project.id
    },
    include: projectInclude
  });

  await notifyOrganizationDiscordWebhook(project.organizationId, {
    content: `Art analysis was refreshed for **${project.name}**.`,
    embeds: [
      {
        title: "Project art analysis completed",
        description: styleSummary,
        color: 5793266,
        fields: [
          {
            name: "Distinctiveness",
            value: String(artAnalysis.distinctivenessScore),
            inline: true
          },
          {
            name: "Market fit",
            value: String(artAnalysis.marketFitScore),
            inline: true
          },
          {
            name: "Complexity",
            value: String(artAnalysis.productionComplexityScore),
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  });

  await recordSubscriptionUsage(project.organizationId, "artAnalysesRun");
  await recordUsage(entitlementContext, {
    featureKey: "artAnalysis",
    limitKey: "artAnalysesPerMonth",
    metadata: {
      projectId: project.id
    }
  });

  return hydrateProjectArtAssets(decryptProject(result));
}

export async function uploadProjectArtAsset(params: {
  projectId: string;
  workspaceId: string;
  userId: string;
  file: File;
  kind?: string;
  notes?: string;
}) {
  const project = await db.project.findFirstOrThrow({
    where: {
      id: params.projectId,
      workspaceId: params.workspaceId
    }
  });

  await assertCanUseFeature({
    userId: params.userId,
    workspaceId: params.workspaceId,
    organizationId: project.organizationId
  }, "artAnalysis");

  const upload = await uploadProjectArtAssetFile({
    organizationId: project.organizationId,
    projectId: project.id,
    file: params.file
  });

  const asset = await db.projectArtAsset.create({
    data: {
      projectId: project.id,
      uploadedById: params.userId,
      kind: params.kind?.trim() || "reference",
      storagePath: upload.storagePath,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
      width: upload.width,
      height: upload.height,
      ...(upload.visualMetrics ? { visualMetrics: upload.visualMetrics as Prisma.InputJsonValue } : {}),
      notes: params.notes?.trim() || null
    }
  });

  return {
    ...asset,
    signedUrl: await createProjectArtAssetSignedUrl(asset.storagePath).catch(() => null)
  };
}

export async function deleteProjectArtAsset(params: {
  projectId: string;
  assetId: string;
  workspaceId: string;
}) {
  const asset = await db.projectArtAsset.findFirstOrThrow({
    where: {
      id: params.assetId,
      projectId: params.projectId,
      project: {
        workspaceId: params.workspaceId
      }
    }
  });

  await db.projectArtAsset.delete({
    where: {
      id: asset.id
    }
  });
  await deleteProjectArtAssetFile(asset.storagePath);

  return { id: asset.id };
}

export async function generateProjectGdd(projectId: string, workspaceId: string, userId: string) {
  const project = decryptProject(await db.project.findFirstOrThrow({
    where: {
      id: projectId,
      workspaceId
    },
    include: {
      analysis: true,
      artAnalysis: true,
      competitorGames: {
        include: {
          steamGame: {
            include: {
              priceCurrent: true,
              revenueEstimates: {
                orderBy: {
                  calculatedAt: "desc"
                },
                take: 1
              }
            }
          }
        }
      },
      gdds: {
        orderBy: {
          version: "desc"
        },
        take: 1
      },
      milestones: {
        orderBy: {
          sortOrder: "asc"
        }
      },
      kanbanBoards: {
        include: {
          columns: {
            orderBy: {
              sortOrder: "asc"
            },
            include: {
              cards: {
                orderBy: {
                  sortOrder: "asc"
                }
              }
            }
          }
        },
        take: 1
      }
    }
  }));

  const entitlementContext = {
    userId,
    workspaceId,
    organizationId: project.organizationId
  };

  await assertCanUseFeature(entitlementContext, "gdd");
  await assertCurrentUsageWithinLimit(entitlementContext, "gdds");

  const nextVersion = (project.gdds[0]?.version ?? 0) + 1;
  const analysis = project.analysis;
  const analysisMetadata = (analysis?.metadata ?? null) as {
    marketDepth?: {
      marketSizeLabel?: string;
      marketSizeCents?: number;
      confidenceLabel?: string;
      confidenceScore?: number;
      reviewVelocity90?: number;
      launchCohorts?: {
        last90Days?: number;
        last180Days?: number;
        last365Days?: number;
      };
      revenueConcentrationPercent?: number;
    };
    competitionLayer?: {
      crowdednessScore?: number;
      qualityBarScore?: number;
      dominantMonetization?: string;
      premiumSharePercent?: number;
    };
    opportunityLayer?: {
      opportunityScore?: number;
      riskScore?: number;
      executionBarScore?: number;
      practicalRecommendations?: string[];
      keyMismatches?: string[];
    };
    projectFitLayer?: {
      overallFitScore?: number;
      priceFitScore?: number;
      monetizationFitScore?: number;
      positioningClarityScore?: number;
    };
    aiLayer?: {
      strategicNarrative?: string;
      positioningSummary?: string;
      launchStrategy?: string;
      pricingNarrative?: string;
      storeCapsuleAdvice?: string;
      confidenceNarrative?: string;
      creativeAngles?: string[];
      acquisitionChannels?: string[];
      wishlistDrivers?: string[];
      redFlags?: string[];
    };
  } | null;
  const comparables = project.competitorGames
    .map((item) => ({
      name: item.steamGame.name,
      reviewScore: item.steamGame.reviewScore,
      reviewCount: item.steamGame.reviewCount,
      priceCents: item.steamGame.priceCurrent?.finalPriceCents ?? null,
      revenueCents: revenueToNumber(item.steamGame.revenueEstimates[0]?.medianNetRevenueCents)
    }))
    .slice(0, 6);
  const launchCohorts = analysisMetadata?.marketDepth?.launchCohorts;
  const recommendations = analysisMetadata?.opportunityLayer?.practicalRecommendations ?? [];
  const keyMismatches = analysisMetadata?.opportunityLayer?.keyMismatches ?? [];
  const creativeAngles = analysisMetadata?.aiLayer?.creativeAngles ?? [];
  const acquisitionChannels = analysisMetadata?.aiLayer?.acquisitionChannels ?? [];
  const wishlistDrivers = analysisMetadata?.aiLayer?.wishlistDrivers ?? [];
  const redFlags = analysisMetadata?.aiLayer?.redFlags ?? [];
  const board = project.kanbanBoards[0] ?? null;
  const activeMilestones = project.milestones.filter((milestone) => milestone.status !== "COMPLETED").slice(0, 8);
  const boardCards = board?.columns.flatMap((column) => column.cards.map((card) => ({
    column: column.name,
    title: card.title,
    assignee: card.assigneeLabel,
    dueDate: card.dueDate,
    labels: Array.isArray(card.labels) ? card.labels : []
  }))) ?? [];
  const featureSeeds = [
    ...parseCsv(project.genreInput),
    ...parseCsv(project.tagInput),
    ...parseCsv(project.coreLoop),
    ...parseCsv(project.differentiator),
    ...creativeAngles
  ].slice(0, 10);
  const productionPillars = [
    project.playerFantasy ? `Deliver the fantasy of ${project.playerFantasy}.` : "Make the player fantasy explicit before production lock.",
    project.coreLoop ? `Protect the core loop: ${project.coreLoop}.` : "Prototype one repeatable 60-second loop before expanding scope.",
    project.differentiator ? `Make the differentiator visible in the first playable slice: ${project.differentiator}.` : "Define one hook that is visible from screenshots and trailer beats.",
    analysisMetadata?.projectFitLayer?.positioningClarityScore !== undefined
      ? `Positioning clarity target: improve from ${analysisMetadata.projectFitLayer.positioningClarityScore}/100 toward a store-ready pitch.`
      : "Create a store-ready positioning statement before capsule review."
  ];
  const mvpFeatures = featureSeeds.length > 0
    ? featureSeeds.map((item, index) => `${index + 1}. ${item}: prove it with one playable, measurable implementation.`)
    : [
        "1. Core movement/combat/interact loop: build one shippable-feeling minute.",
        "2. Progression reward: define why the second session should happen.",
        "3. Store-facing hook: create a visual or systemic moment that can sell the game."
      ];
  const acceptanceCriteria = [
    analysisMetadata?.opportunityLayer?.executionBarScore !== undefined
      ? `Prototype scope must match an execution bar of ${analysisMetadata.opportunityLayer.executionBarScore}/100.`
      : "Prototype scope must be small enough for the current team to finish.",
    analysisMetadata?.projectFitLayer?.priceFitScore !== undefined
      ? `Price/value promise must reach a fit score above current ${analysisMetadata.projectFitLayer.priceFitScore}/100 before pricing lock.`
      : "Price/value promise must be tested against direct comparable games.",
    project.artAnalysis?.marketFitScore !== undefined
      ? `Visual direction must maintain market fit above ${project.artAnalysis.marketFitScore}/100 while improving distinctiveness.`
      : "Visual direction must pass a capsule readability review.",
    "Every feature entering production needs an owner, a done definition, and a validation signal."
  ];
  const validationPlan = [
    "Run a 5-player friction test on the first playable loop.",
    "Compare capsule, short description, and first 15 seconds of trailer against the strongest comparable games.",
    "Track wishlist intent, demo completion, first-session retention, and feature confusion notes.",
    analysisMetadata?.marketDepth?.confidenceLabel === "Low"
      ? "Improve comparable coverage before greenlighting budget-sensitive scope."
      : "Refresh market analysis before each production milestone."
  ];
  const generatedBacklog = boardCards.length > 0
    ? boardCards.slice(0, 12).map((card) => `- [${card.column}] ${card.title}${card.assignee ? ` — owner: ${card.assignee}` : ""}${card.labels.length > 0 ? ` — labels: ${card.labels.join(", ")}` : ""}`)
    : mvpFeatures.map((item) => `- ${item}`);
  const content = [
    `# ${project.name} - Game Design Document`,
    "",
    `Version: ${nextVersion}`,
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## 1. Executive Design Thesis",
    project.elevatorPitch
      ? `This game should be produced around the promise: ${project.elevatorPitch}`
      : "This project still needs a sharper one-sentence promise before it is production-ready.",
    analysisMetadata?.aiLayer?.strategicNarrative || analysis?.opportunitySummary || "Market analysis is missing, so this GDD treats the concept as an unvalidated production thesis.",
    "",
    "### Production decision",
    analysisMetadata?.opportunityLayer?.opportunityScore !== undefined && analysisMetadata.opportunityLayer.opportunityScore >= 70
      ? "Proceed as a high-upside thesis, but keep milestone gates strict because upside still depends on execution quality."
      : "Proceed as a controlled validation project until positioning, prototype proof, and market confidence improve.",
    "",
    "## 2. Player Promise",
    `- Primary fantasy: ${project.playerFantasy || analysis?.audienceAutofill || "TBD"}`,
    `- Target audience: ${project.targetAudience || analysis?.audienceAutofill || "TBD"}`,
    `- Core loop: ${project.coreLoop || analysis?.coreLoopAutofill || "TBD"}`,
    `- Differentiator: ${project.differentiator || "TBD"}`,
    `- Store hook: ${analysisMetadata?.aiLayer?.storeCapsuleAdvice || "TBD"}`,
    "",
    "## 3. Generated Production Pillars",
    ...productionPillars.map((item) => `- ${item}`),
    "",
    "## 4. MVP Feature Set",
    ...mvpFeatures.map((item) => `- ${item}`),
    "",
    "## 5. Systems Design Notes",
    `- Moment-to-moment: ${project.coreLoop || "Define the first playable interaction loop."}`,
    `- Progression: ${project.monetizationModel ? `Support the ${project.monetizationModel} model without hiding core satisfaction behind economy friction.` : "Define progression rewards before content scale-up."}`,
    `- Content structure: Use milestones and Kanban status as production truth; avoid adding features without a board owner.`,
    `- Difficulty/readability: Make the first session teach the fantasy without requiring external explanation.`,
    "",
    "## 6. Market Constraints To Design Against",
    `- Market size: ${analysisMetadata?.marketDepth?.marketSizeLabel || "Unknown"}`,
    `- Opportunity score: ${analysisMetadata?.opportunityLayer?.opportunityScore ?? "N/A"}`,
    `- Risk score: ${analysisMetadata?.opportunityLayer?.riskScore ?? "N/A"}`,
    `- Fit score: ${analysisMetadata?.projectFitLayer?.overallFitScore ?? "N/A"}`,
    `- Confidence: ${analysisMetadata?.marketDepth?.confidenceLabel ? `${analysisMetadata.marketDepth.confidenceLabel} (${analysisMetadata.marketDepth.confidenceScore ?? "N/A"})` : "Unknown"}`,
    analysis?.marketSummary || "Run market analysis to populate this section.",
    "",
    "## 7. Comparable Game Lessons",
    ...(comparables.length > 0
      ? comparables.map((item, index) => `${index + 1}. ${item.name}: use as a bar for ${item.reviewScore ? `${item.reviewScore.toFixed(1)}% review quality` : "quality"} and ${item.priceCents ? `${formatMoney(item.priceCents)} price expectation` : "pricing expectation"}.`)
      : ["No competitor set has been attached yet. Add direct comparables before production lock."]),
    "",
    "## 8. Acceptance Criteria",
    ...acceptanceCriteria.map((item) => `- ${item}`),
    "",
    "## 9. Validation Plan",
    ...validationPlan.map((item) => `- ${item}`),
    "",
    "## 10. Positioning And Go-To-Market",
    analysisMetadata?.aiLayer?.positioningSummary || "Positioning layer pending analysis.",
    analysisMetadata?.aiLayer?.launchStrategy || "Run market analysis to generate launch strategy guidance.",
    "",
    "### Acquisition channels",
    ...(acquisitionChannels.length > 0 ? acquisitionChannels.map((item) => `- ${item}`) : ["- Acquisition channel guidance pending analysis."]),
    "",
    "### Wishlist drivers",
    ...(wishlistDrivers.length > 0 ? wishlistDrivers.map((item) => `- ${item}`) : ["- Wishlist driver guidance pending analysis."]),
    "",
    "### Creative angles",
    ...(creativeAngles.length > 0 ? creativeAngles.map((item) => `- ${item}`) : ["- Creative angle guidance pending analysis."]),
    "",
    "## 11. Art Direction Requirements",
    project.artAnalysis?.styleSummary || "Run art analysis to populate this section.",
    project.artAnalysis?.productionSummary || "Production notes pending.",
    "",
    "## 12. Production Backlog",
    ...generatedBacklog,
    "",
    "## 13. Milestone Gates",
    ...(activeMilestones.length > 0
      ? activeMilestones.map((milestone) => `- ${milestone.title}: ${milestone.status}${milestone.dueAt ? `, due ${milestone.dueAt.toISOString().slice(0, 10)}` : ""}. ${milestone.description ?? "Define exit criteria before work starts."}`)
      : ["- Create milestone gates for prototype, vertical slice, content lock, launch readiness, and post-launch review."]),
    "",
    "## 14. Risk Register",
    ...(redFlags.length > 0 ? redFlags.map((item) => `- ${item}`) : keyMismatches.length > 0 ? keyMismatches.map((item) => `- ${item}`) : analysis?.riskSummary ? [`- ${analysis.riskSummary}`] : ["- Risk register pending analysis."]),
    "",
    "## 15. Recommended Next Moves",
    ...(recommendations.length > 0 ? recommendations.map((item) => `- ${item}`) : ["- Keep refining the concept against direct Steam comparables."]),
    `- Pricing: ${analysisMetadata?.aiLayer?.pricingNarrative || `Current target price is ${project.pricePointCents ? formatMoney(project.pricePointCents) : "TBD"}; validate against comparable perceived value.`}`,
    `- Market cadence: ${launchCohorts?.last90Days ?? "N/A"} comparable launches in 90d and ${launchCohorts?.last180Days ?? "N/A"} in 180d.`
  ].join("\n");

  const gdd = await db.projectGdd.create({
    data: {
      projectId: project.id,
      version: nextVersion,
      title: `${project.name} GDD v${nextVersion}`,
      content: encryptNullableString(content, `projectGdd:${project.id}:content`) ?? content
    }
  });

  const result = await db.project.findUniqueOrThrow({
    where: {
      id: project.id
    },
    include: projectInclude
  });

  await notifyOrganizationDiscordWebhook(project.organizationId, {
    content: `A new GDD version is ready for **${project.name}**.`,
    embeds: [
      {
        title: "GDD generated",
        description: `Version ${gdd.version} was created. Review it in ${appUrl}/projects/${project.id}.`,
        color: 5763719,
        timestamp: new Date().toISOString()
      }
    ]
  });

  await recordSubscriptionUsage(project.organizationId, "gddsGenerated");

  return hydrateProjectArtAssets(decryptProject(result));
}

export async function createKanbanColumn(params: {
  projectId: string;
  workspaceId: string;
  name: string;
  color?: string;
}) {
  const board = await db.kanbanBoard.findFirstOrThrow({
    where: {
      projectId: params.projectId,
      project: {
        workspaceId: params.workspaceId
      }
    },
    include: {
      columns: {
        orderBy: {
          sortOrder: "desc"
        },
        take: 1
      }
    }
  });

  await db.kanbanColumn.create({
    data: {
      boardId: board.id,
      name: params.name.trim(),
      color: params.color?.trim() || null,
      sortOrder: (board.columns[0]?.sortOrder ?? -1) + 1
    }
  });

  return getProjectById(params.projectId, params.workspaceId);
}

export async function updateKanbanColumn(params: {
  projectId: string;
  workspaceId: string;
  columnId: string;
  name?: string;
  color?: string | null;
  sortOrder?: number;
}) {
  const column = await db.kanbanColumn.findFirstOrThrow({
    where: {
      id: params.columnId,
      board: {
        projectId: params.projectId,
        project: {
          workspaceId: params.workspaceId
        }
      }
    }
  });

  await db.kanbanColumn.update({
    where: {
      id: column.id
    },
    data: {
      ...(params.name !== undefined ? { name: params.name.trim() } : {}),
      ...(params.color !== undefined ? { color: params.color?.trim() || null } : {}),
      ...(params.sortOrder !== undefined ? { sortOrder: params.sortOrder } : {})
    }
  });

  return getProjectById(params.projectId, params.workspaceId);
}

async function reorderColumns(boardId: string) {
  const columns = await db.kanbanColumn.findMany({
    where: {
      boardId
    },
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "asc" }
    ]
  });

  await Promise.all(columns.map((column, index) => db.kanbanColumn.update({
    where: {
      id: column.id
    },
    data: {
      sortOrder: index
    }
  })));
}

async function reorderCards(columnId: string) {
  const cards = await db.kanbanCard.findMany({
    where: {
      columnId
    },
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "asc" }
    ]
  });

  await Promise.all(cards.map((card, index) => db.kanbanCard.update({
    where: {
      id: card.id
    },
    data: {
      sortOrder: index
    }
  })));
}

export async function createKanbanCard(params: {
  projectId: string;
  workspaceId: string;
  columnId: string;
  title: string;
  description?: string;
  assigneeLabel?: string;
  dueDate?: Date | null;
  labels?: string[];
}) {
  const column = await db.kanbanColumn.findFirstOrThrow({
    where: {
      id: params.columnId,
      board: {
        projectId: params.projectId,
        project: {
          workspaceId: params.workspaceId
        }
      }
    },
    include: {
      cards: {
        orderBy: {
          sortOrder: "desc"
        },
        take: 1
      }
    }
  });

  await db.kanbanCard.create({
    data: {
      columnId: column.id,
      title: params.title.trim(),
      description: params.description?.trim() || null,
      assigneeLabel: params.assigneeLabel?.trim() || null,
      dueDate: params.dueDate ?? null,
      labels: params.labels ?? [],
      sortOrder: (column.cards[0]?.sortOrder ?? -1) + 1
    }
  });

  return getProjectById(params.projectId, params.workspaceId);
}

export async function updateKanbanCard(params: {
  projectId: string;
  workspaceId: string;
  cardId: string;
  columnId?: string;
  title?: string;
  description?: string | null;
  assigneeLabel?: string | null;
  dueDate?: Date | null;
  sortOrder?: number;
  labels?: string[];
}) {
  const card = await db.kanbanCard.findFirstOrThrow({
    where: {
      id: params.cardId,
      column: {
        board: {
          projectId: params.projectId,
          project: {
            workspaceId: params.workspaceId
          }
        }
      }
    }
  });

  if (params.columnId) {
    await db.kanbanColumn.findFirstOrThrow({
      where: {
        id: params.columnId,
        board: {
          projectId: params.projectId,
          project: {
            workspaceId: params.workspaceId
          }
        }
      }
    });
  }

  await db.kanbanCard.update({
    where: {
      id: card.id
    },
    data: {
      ...(params.columnId !== undefined ? { columnId: params.columnId } : {}),
      ...(params.title !== undefined ? { title: params.title.trim() } : {}),
      ...(params.description !== undefined ? { description: params.description?.trim() || null } : {}),
      ...(params.assigneeLabel !== undefined ? { assigneeLabel: params.assigneeLabel?.trim() || null } : {}),
      ...(params.dueDate !== undefined ? { dueDate: params.dueDate ?? null } : {}),
      ...(params.sortOrder !== undefined ? { sortOrder: params.sortOrder } : {}),
      ...(params.labels !== undefined ? { labels: params.labels } : {})
    }
  });

  if (params.columnId && params.columnId !== card.columnId) {
    await reorderCards(card.columnId);
    await reorderCards(params.columnId);
  }

  if (params.sortOrder !== undefined) {
    await reorderCards(params.columnId ?? card.columnId);
  }

  return getProjectById(params.projectId, params.workspaceId);
}

export async function moveKanbanColumn(params: {
  projectId: string;
  workspaceId: string;
  columnId: string;
  direction: "left" | "right";
}) {
  const column = await db.kanbanColumn.findFirstOrThrow({
    where: {
      id: params.columnId,
      board: {
        projectId: params.projectId,
        project: {
          workspaceId: params.workspaceId
        }
      }
    }
  });
  const target = await db.kanbanColumn.findFirst({
    where: {
      boardId: column.boardId,
      sortOrder: params.direction === "left" ? column.sortOrder - 1 : column.sortOrder + 1
    }
  });

  if (!target) {
    return getProjectById(params.projectId, params.workspaceId);
  }

  await db.$transaction([
    db.kanbanColumn.update({
      where: { id: column.id },
      data: { sortOrder: target.sortOrder }
    }),
    db.kanbanColumn.update({
      where: { id: target.id },
      data: { sortOrder: column.sortOrder }
    })
  ]);
  await reorderColumns(column.boardId);

  return getProjectById(params.projectId, params.workspaceId);
}

export async function deleteKanbanColumn(params: {
  projectId: string;
  workspaceId: string;
  columnId: string;
}) {
  const column = await db.kanbanColumn.findFirstOrThrow({
    where: {
      id: params.columnId,
      board: {
        projectId: params.projectId,
        project: {
          workspaceId: params.workspaceId
        }
      }
    }
  });

  await db.kanbanColumn.delete({
    where: {
      id: column.id
    }
  });
  await reorderColumns(column.boardId);

  return getProjectById(params.projectId, params.workspaceId);
}

export async function moveKanbanCard(params: {
  projectId: string;
  workspaceId: string;
  cardId: string;
  direction: "up" | "down";
}) {
  const card = await db.kanbanCard.findFirstOrThrow({
    where: {
      id: params.cardId,
      column: {
        board: {
          projectId: params.projectId,
          project: {
            workspaceId: params.workspaceId
          }
        }
      }
    }
  });
  const target = await db.kanbanCard.findFirst({
    where: {
      columnId: card.columnId,
      sortOrder: params.direction === "up" ? card.sortOrder - 1 : card.sortOrder + 1
    }
  });

  if (!target) {
    return getProjectById(params.projectId, params.workspaceId);
  }

  await db.$transaction([
    db.kanbanCard.update({
      where: { id: card.id },
      data: { sortOrder: target.sortOrder }
    }),
    db.kanbanCard.update({
      where: { id: target.id },
      data: { sortOrder: card.sortOrder }
    })
  ]);
  await reorderCards(card.columnId);

  return getProjectById(params.projectId, params.workspaceId);
}

export async function reorderKanbanCard(params: {
  projectId: string;
  workspaceId: string;
  cardId: string;
  columnId: string;
  targetIndex: number;
}) {
  const card = await db.kanbanCard.findFirstOrThrow({
    where: {
      id: params.cardId,
      column: {
        board: {
          projectId: params.projectId,
          project: {
            workspaceId: params.workspaceId
          }
        }
      }
    }
  });
  const columns = await db.kanbanColumn.findMany({
    where: {
      id: {
        in: [card.columnId, params.columnId]
      },
      board: {
        projectId: params.projectId,
        project: {
          workspaceId: params.workspaceId
        }
      }
    },
    include: {
      cards: {
        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "asc" }
        ]
      }
    }
  });
  const sourceColumn = columns.find((column) => column.id === card.columnId);
  const targetColumn = columns.find((column) => column.id === params.columnId);

  if (!sourceColumn || !targetColumn) {
    throw new Error("Kanban column not found.");
  }

  const sourceCards = sourceColumn.cards.filter((item) => item.id !== card.id);
  const targetCards = (sourceColumn.id === targetColumn.id ? sourceCards : targetColumn.cards.filter((item) => item.id !== card.id));
  const nextIndex = Math.min(params.targetIndex, targetCards.length);

  targetCards.splice(nextIndex, 0, card);

  const updates = targetCards.map((item, index) => db.kanbanCard.update({
    where: {
      id: item.id
    },
    data: {
      columnId: targetColumn.id,
      sortOrder: index
    }
  }));

  if (sourceColumn.id !== targetColumn.id) {
    updates.push(...sourceCards.map((item, index) => db.kanbanCard.update({
      where: {
        id: item.id
      },
      data: {
        columnId: sourceColumn.id,
        sortOrder: index
      }
    })));
  }

  await db.$transaction(updates);

  return getProjectById(params.projectId, params.workspaceId);
}

export async function deleteKanbanCard(params: {
  projectId: string;
  workspaceId: string;
  cardId: string;
}) {
  const card = await db.kanbanCard.findFirstOrThrow({
    where: {
      id: params.cardId,
      column: {
        board: {
          projectId: params.projectId,
          project: {
            workspaceId: params.workspaceId
          }
        }
      }
    }
  });

  await db.kanbanCard.delete({
    where: {
      id: card.id
    }
  });
  await reorderCards(card.columnId);

  return getProjectById(params.projectId, params.workspaceId);
}

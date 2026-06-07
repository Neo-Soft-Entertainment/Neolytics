import { Prisma, ProjectStage, SubscriptionPlan } from "@prisma/client";

import { db } from "@/lib/db";
import { env } from "@/env";
import { notifyOrganizationDiscordWebhook } from "@/lib/discord";
import { generateAiProjectMarketAnalysis } from "@/lib/market-analysis-ai";
import { slugify } from "@/lib/slugify";
import {
  consumeSubscriptionUsage,
  enforceSubscriptionCapacity,
  enforceSubscriptionCapability
} from "@/lib/subscription-service";
import { buildUniqueSlug } from "@/lib/unique-slug";

const defaultKanbanColumns = [
  { name: "Backlog", color: "#64748b" },
  { name: "Research", color: "#0ea5e9" },
  { name: "In Progress", color: "#f59e0b" },
  { name: "Blocked", color: "#ef4444" },
  { name: "Done", color: "#10b981" }
];

function parseCsv(value?: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(/[,\n;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

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
    take: 40
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
      elevatorPitch: params.elevatorPitch?.trim() || null,
      description: params.description?.trim() || null,
      genreInput: params.genreInput?.trim() || null,
      tagInput: params.tagInput?.trim() || null,
      targetAudience: params.targetAudience?.trim() || null,
      coreLoop: params.coreLoop?.trim() || null,
      differentiator: params.differentiator?.trim() || null,
      monetizationModel: params.monetizationModel?.trim() || null,
      artDirection: params.artDirection?.trim() || null,
      playerFantasy: params.playerFantasy?.trim() || null,
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

  return project;
}

export async function listProjects(workspaceId: string) {
  return db.project.findMany({
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
}

export async function getProjectById(projectId: string, workspaceId: string) {
  return db.project.findFirst({
    where: {
      id: projectId,
      workspaceId
    },
    include: projectInclude
  });
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
    data.elevatorPitch = params.elevatorPitch?.trim() || null;
  }

  if (params.description !== undefined) {
    data.description = params.description?.trim() || null;
  }

  if (params.genreInput !== undefined) {
    data.genreInput = params.genreInput?.trim() || null;
  }

  if (params.tagInput !== undefined) {
    data.tagInput = params.tagInput?.trim() || null;
  }

  if (params.targetAudience !== undefined) {
    data.targetAudience = params.targetAudience?.trim() || null;
  }

  if (params.coreLoop !== undefined) {
    data.coreLoop = params.coreLoop?.trim() || null;
  }

  if (params.differentiator !== undefined) {
    data.differentiator = params.differentiator?.trim() || null;
  }

  if (params.monetizationModel !== undefined) {
    data.monetizationModel = params.monetizationModel?.trim() || null;
  }

  if (params.artDirection !== undefined) {
    data.artDirection = params.artDirection?.trim() || null;
  }

  if (params.playerFantasy !== undefined) {
    data.playerFantasy = params.playerFantasy?.trim() || null;
  }

  if (params.pricePointCents !== undefined) {
    data.pricePointCents = params.pricePointCents;
  }

  if (params.stage !== undefined) {
    data.stage = params.stage;
  }

  return db.project.update({
    where: {
      id: params.projectId
    },
    data,
    include: projectInclude
  });
}

export async function analyzeProject(projectId: string, workspaceId: string) {
  const project = await db.project.findFirstOrThrow({
    where: {
      id: projectId,
      workspaceId
    }
  });

  await consumeSubscriptionUsage(project.organizationId, "projectAnalysesRun");
  const matchingGames = await getComparableGames(project);
  const { genreTokens: projectGenres, tagTokens: projectTags } = await getProjectSignalSlugs(project);
  const now = Date.now();
  const enrichedGames = matchingGames.map((game) => {
    const gameGenres = game.genres.map((genre) => genre.steamGenre.slug);
    const gameTags = game.tags.map((tag) => tag.steamTag.slug);
    const genreMatches = gameGenres.filter((genre) => projectGenres.includes(genre)).length;
    const tagMatches = gameTags.filter((tag) => projectTags.includes(tag)).length;
    const genreCoverage = projectGenres.length > 0 ? genreMatches / projectGenres.length : 0;
    const tagCoverage = projectTags.length > 0 ? tagMatches / projectTags.length : 0;
    const similarityScore = clampScore(
      genreCoverage * 60
      + tagCoverage * 40
      + (project.name.trim() && game.name.toLowerCase().includes(project.name.trim().toLowerCase()) ? 10 : 0)
    );

    return {
      ...game,
      similarityScore,
      genreMatches,
      tagMatches,
      isDirectComparable: similarityScore >= 45 || (genreMatches > 0 && tagMatches > 0)
    };
  });
  const directComparables = enrichedGames
    .filter((game) => game.isDirectComparable)
    .sort((left, right) => right.similarityScore - left.similarityScore || (right.reviewCount ?? 0) - (left.reviewCount ?? 0));
  const adjacentComparables = enrichedGames
    .filter((game) => !game.isDirectComparable)
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
    keyMismatches
  };
  const opportunitySummary = opportunityScore >= 70
    ? `This looks like a commercially active segment with enough room for a sharply positioned entrant. The biggest upside comes from ${revenuePotentialScore >= 70 ? "meaningful revenue headroom" : "healthy niche demand"} without fully runaway saturation.`
    : `The niche can still work, but the opportunity is conditional on stronger positioning. Right now the upside is being compressed by ${crowdednessScore >= 65 ? "competition density" : "uneven demand coverage"}.`;
  const riskSummary = riskScore >= 65
    ? `Risk is elevated because ${revenueConcentrationPercent >= 65 ? "a few winners dominate revenue capture" : "the niche still shows weak or unstable momentum"}, and the execution bar is ${executionBarScore >= 70 ? "high" : "non-trivial"}.`
    : `Risk is manageable for a disciplined team. The main challenge is outperforming the current quality bar rather than entering a structurally broken segment.`;
  const marketSummary = [
    `${directComparables.length} direct comparables and ${adjacentComparables.length} adjacent comps were identified from the current Steam dataset.`,
    totalRevenueCents > 0 ? `The tracked market depth looks ${marketDepth.marketSizeLabel.toLowerCase()}, with roughly ${formatMoney(totalRevenueCents)} in cumulative estimated net revenue across the matched set and a median of ${formatMoney(medianRevenueCents)}.` : "Revenue coverage is still thin, so the market sizing layer should be treated cautiously.",
    reviewVelocity.reviewVelocity90 > 0 ? `Review velocity added ${reviewVelocity.reviewVelocity90.toLocaleString("en-US")} reviews in the last 90 days versus ${reviewVelocity.previousReviewVelocity90.toLocaleString("en-US")} in the prior window.` : "Temporal review coverage is still limited, so momentum should be treated as directional rather than conclusive.",
    launches365 > 0 ? `${launches365} comparable launches landed in the last 12 months, with ${launches90} arriving in the last 90 days.` : "Recent launch activity is quiet in this segment."
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
  const finalMarketSummary = aiLayer?.marketSummary || marketSummary;
  const finalOpportunitySummary = aiLayer?.opportunitySummary || opportunitySummary;
  const finalRiskSummary = aiLayer?.riskSummary || riskSummary;
  const finalAudienceAutofill = aiLayer?.audienceAutofill || audienceAutofill;
  const finalCoreLoopAutofill = aiLayer?.coreLoopAutofill || coreLoopAutofill;
  const analysisMetadata = {
    topCompetitorIds: topCompetitors.map((game) => game.id),
    topCompetitorNames: topCompetitors.map((game) => game.name),
    marketDepth,
    competitionLayer,
    opportunityLayer,
    projectFitLayer,
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

  return result;
}

export async function analyzeProjectArt(projectId: string, workspaceId: string) {
  const project = await db.project.findFirstOrThrow({
    where: {
      id: projectId,
      workspaceId
    }
  });

  await enforceSubscriptionCapability(project.organizationId, "artAnalyses");
  await consumeSubscriptionUsage(project.organizationId, "artAnalysesRun");
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
        averageReviewScore >= 85 ? "premium finish" : "readability-first palette"
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
        competitionCount > 10 ? "crowded shelf" : "open shelf"
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
    - Math.min(competitionCount, 18) * 1.5,
    18,
    96
  );
  const productionComplexityScore = clampScore(
    45
    + realismComplexity
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
  );
  const visualTrendScore = clampScore(competitionCount > 0 ? (releaseMomentum / competitionCount) * 100 : 25);
  const styleSummary =
    topCompetitors.length > 0
      ? `Comparable Steam games currently cluster around ${moodKeywords.slice(0, 2).join(" and ") || "clear visual positioning"}, with ${paletteKeywords.slice(0, 2).join(" plus ") || "readable capsule contrast"} showing up as the strongest shelf signal.`
      : "The current dataset does not have enough comparable art references yet, so the visual brief should be treated as exploratory.";
  const fitSummary =
    marketFitScore >= 70
      ? "The proposed art direction is close to the current quality bar for this niche and should support commercial positioning if execution stays consistent."
      : "The current art direction thesis is still under-specified relative to the niche, so the market fit will depend heavily on sharpening readability, fantasy, and store presence.";
  const productionSummary =
    productionComplexityScore >= 70
      ? "This visual direction has a high production cost profile. Scope, outsourcing, and animation complexity need to be kept under tight control."
      : "This direction is commercially workable without blockbuster art scope, as long as the team keeps consistency high across key surfaces.";
  const recommendationSummary = [
    distinctivenessScore < 55 ? "Push a more ownable silhouette or color story before production lock." : "Keep the current visual hook and reinforce it in the capsule and hero scenes.",
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

  await db.project.update({
    where: {
      id: project.id
    },
    data: {
      artDirection: project.artDirection?.trim() || `Target a ${moodKeywords.slice(0, 2).join(" / ") || "market-readable"} visual profile with ${paletteKeywords.slice(0, 2).join(" and ") || "clear contrast"} as the strongest shelf signal.`
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

  return result;
}

export async function generateProjectGdd(projectId: string, workspaceId: string) {
  const project = await db.project.findFirstOrThrow({
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
      }
    }
  });
  await consumeSubscriptionUsage(project.organizationId, "gddsGenerated");

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
  const content = [
    `# ${project.name} - Game Design Document`,
    "",
    `Version: ${nextVersion}`,
    "",
    "## Vision",
    project.elevatorPitch || "Define a sharper elevator pitch before greenlight.",
    "",
    "## Player Fantasy",
    project.playerFantasy || analysis?.audienceAutofill || "Clarify the fantasy this project should own in the market.",
    "",
    "## Audience",
    project.targetAudience || analysis?.audienceAutofill || "Audience not defined yet.",
    "",
    "## Core Loop",
    project.coreLoop || analysis?.coreLoopAutofill || "Core loop not defined yet.",
    "",
    "## Differentiation",
    project.differentiator || "",
    ...(Array.isArray(analysis?.differentiators) ? (analysis?.differentiators as string[]).map((item) => `- ${item}`) : []),
    "",
    "## Commercial Thesis",
    analysisMetadata?.aiLayer?.strategicNarrative || "Run market analysis to generate the commercial thesis layer.",
    "",
    "## Market Snapshot",
    analysis?.marketSummary || "Run market analysis to populate this section.",
    "",
    "## Opportunity Thesis",
    analysis?.opportunitySummary || "Opportunity thesis pending analysis.",
    "",
    "## Risks",
    analysis?.riskSummary || "Risk analysis pending.",
    "",
    "## Market Operating Read",
    `- Market size: ${analysisMetadata?.marketDepth?.marketSizeLabel || "Unknown"}`,
    `- Opportunity score: ${analysisMetadata?.opportunityLayer?.opportunityScore ?? "N/A"}`,
    `- Risk score: ${analysisMetadata?.opportunityLayer?.riskScore ?? "N/A"}`,
    `- Fit score: ${analysisMetadata?.projectFitLayer?.overallFitScore ?? "N/A"}`,
    `- Confidence: ${analysisMetadata?.marketDepth?.confidenceLabel ? `${analysisMetadata.marketDepth.confidenceLabel} (${analysisMetadata.marketDepth.confidenceScore ?? "N/A"})` : "Unknown"}`,
    `- Revenue concentration: ${analysisMetadata?.marketDepth?.revenueConcentrationPercent ?? "N/A"}%`,
    `- Review velocity (90d): ${analysisMetadata?.marketDepth?.reviewVelocity90?.toLocaleString("en-US") ?? "N/A"}`,
    `- Launches in 90d: ${launchCohorts?.last90Days ?? "N/A"}`,
    `- Launches in 180d: ${launchCohorts?.last180Days ?? "N/A"}`,
    "",
    "## Positioning",
    analysisMetadata?.aiLayer?.positioningSummary || "Positioning layer pending analysis.",
    "",
    "## Pricing",
    analysisMetadata?.aiLayer?.pricingNarrative || `Current target price: ${project.pricePointCents ? formatMoney(project.pricePointCents) : "TBD"}.`,
    "",
    "## Go-to-Market",
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
    "## Art direction analysis",
    project.artAnalysis?.styleSummary || "Run art analysis to populate this section.",
    "",
    "## Visual production notes",
    project.artAnalysis?.productionSummary || "Production notes pending.",
    "",
    "## Competitive Set",
    ...(comparables.length > 0
      ? comparables.map((item, index) => `${index + 1}. ${item.name} - ${item.priceCents ? formatMoney(item.priceCents) : "price unknown"} · ${item.reviewScore ? `${item.reviewScore.toFixed(1)}% review score` : "review score unknown"} · ${item.revenueCents > 0 ? `${formatMoney(item.revenueCents)} est. net revenue` : "revenue estimate unavailable"}`)
      : ["No competitor set has been attached yet."]),
    "",
    "## Production Pillars",
    `- Genre focus: ${project.genreInput || "TBD"}`,
    `- Tag focus: ${project.tagInput || "TBD"}`,
    `- Monetization: ${project.monetizationModel || "TBD"}${analysisMetadata?.competitionLayer?.dominantMonetization ? ` (market baseline: ${analysisMetadata.competitionLayer.dominantMonetization})` : ""}`,
    `- Price target: ${project.pricePointCents ? (project.pricePointCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" }) : "TBD"}`,
    `- Art direction: ${project.artDirection || "TBD"}`,
    `- Positioning clarity score: ${analysisMetadata?.projectFitLayer?.positioningClarityScore ?? "N/A"}`,
    `- Price fit score: ${analysisMetadata?.projectFitLayer?.priceFitScore ?? "N/A"}`,
    `- Monetization fit score: ${analysisMetadata?.projectFitLayer?.monetizationFitScore ?? "N/A"}`,
    "",
    "## Store Read",
    analysisMetadata?.aiLayer?.storeCapsuleAdvice || "Store-facing guidance pending analysis.",
    "",
    "## Risk Register",
    ...(redFlags.length > 0 ? redFlags.map((item) => `- ${item}`) : keyMismatches.length > 0 ? keyMismatches.map((item) => `- ${item}`) : ["- Risk register pending analysis."]),
    "",
    "## Recommended next moves",
    ...(recommendations.length > 0 ? recommendations.map((item) => `- ${item}`) : ["- Keep refining the concept against direct Steam comparables."]),
    "",
    "## Next Validation Steps",
    "- Confirm the feature stack against the top Steam comps.",
    "- Tighten the fantasy and store positioning before production lock.",
    "- Keep market analysis updated as the concept evolves.",
    ...(analysisMetadata?.marketDepth?.confidenceLabel === "Low" ? ["- Improve research coverage before final budget or production commitments."] : [])
  ].join("\n");

  const gdd = await db.projectGdd.create({
    data: {
      projectId: project.id,
      version: nextVersion,
      title: `${project.name} GDD v${nextVersion}`,
      content
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
        description: `Version ${gdd.version} was created. Review it in ${env.AUTH_URL}/projects/${project.id}.`,
        color: 5763719,
        timestamp: new Date().toISOString()
      }
    ]
  });

  return result;
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

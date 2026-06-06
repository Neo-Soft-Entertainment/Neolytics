import { Prisma, ProjectStage } from "@prisma/client";

import { db } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { consumeSubscriptionUsage, enforceSubscriptionCapacity } from "@/lib/subscription-service";
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
    .split(",")
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

const projectInclude = {
  analysis: true,
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
    }
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

  return db.project.create({
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

  const genreTokens = parseCsv(project.genreInput).map(slugify);
  const tagTokens = parseCsv(project.tagInput).map(slugify);
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

  if (project.name) {
    matchingRules.push({
      name: {
        contains: project.name,
        mode: "insensitive"
      }
    });
  }

  const matchingGames = await db.steamGame.findMany({
    where: {
      OR: matchingRules
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
    orderBy: [
      {
        reviewCount: "desc"
      }
    ],
    take: 40
  });

  const competitionCount = matchingGames.length;
  const revenueValues = matchingGames
    .map((game) => revenueToNumber(game.revenueEstimates[0]?.medianNetRevenueCents))
    .filter((value) => value > 0);
  const priceValues = matchingGames
    .map((game) => game.priceCurrent?.finalPriceCents ?? 0)
    .filter((value) => value > 0);
  const reviewValues = matchingGames
    .map((game) => game.reviewScore ?? 0)
    .filter((value) => value > 0);
  const releaseMomentum = matchingGames.filter((game) => {
    if (!game.releaseDate) {
      return false;
    }

    const ageInDays = (Date.now() - game.releaseDate.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays <= 365;
  }).length;
  const topCompetitors = matchingGames.slice(0, 6);
  const medianRevenueCents = median(revenueValues);
  const averagePriceCents = priceValues.length > 0
    ? Math.round(priceValues.reduce((sum, value) => sum + value, 0) / priceValues.length)
    : null;
  const averageReviewScore = reviewValues.length > 0
    ? Number((reviewValues.reduce((sum, value) => sum + value, 0) / reviewValues.length).toFixed(1))
    : null;
  const opportunitySummary = competitionCount <= 8
    ? "The niche is still relatively open. A differentiated execution has room to break through."
    : "The niche already has visible supply. You need sharper positioning and production quality to stand out.";
  const riskSummary = averageReviewScore && averageReviewScore < 75
    ? "Comparable games in this space underperform on player satisfaction, which raises product and retention risk."
    : "The main risk is execution against established category expectations, not lack of demand.";
  const marketSummary = [
    `${competitionCount} comparable Steam games were matched from the current dataset.`,
    medianRevenueCents > 0 ? `Median estimated net revenue across the set is ${(medianRevenueCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}.` : "Revenue coverage is still building for this segment.",
    averageReviewScore ? `Average review score in the set is ${averageReviewScore.toFixed(1)}%.` : "Review score coverage is limited in this segment.",
    releaseMomentum > 0 ? `${releaseMomentum} comparable launches landed in the last 12 months.` : "This segment has been quiet over the last 12 months."
  ].join(" ");
  const suggestedGenres = Array.from(
    new Set(topCompetitors.flatMap((game) => game.genres.map((genre) => genre.steamGenre.name)))
  ).slice(0, 5);
  const suggestedTags = Array.from(
    new Set(topCompetitors.flatMap((game) => game.tags.map((tag) => tag.steamTag.name)))
  ).slice(0, 8);
  const audienceAutofill = project.targetAudience?.trim()
    || `Players who actively buy ${suggestedGenres.slice(0, 2).join(" / ") || "genre"} games on Steam and respond to clear market hooks.`;
  const coreLoopAutofill = project.coreLoop?.trim()
    || `Deliver a repeatable gameplay loop around ${suggestedTags.slice(0, 3).join(", ") || "clear player mastery"} with visible long-term progression.`;
  const differentiators = [
    project.differentiator?.trim(),
    competitionCount > 10 ? "Sharpen the fantasy and production hook early because the niche is already busy." : "Use a distinctive art and UX hook to claim a clearer identity early.",
    averagePriceCents ? `Anchor pricing near ${(averagePriceCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} unless your scope materially exceeds the segment.` : null
  ].filter((item): item is string => Boolean(item));

  await db.project.update({
    where: {
      id: project.id
    },
    data: {
      targetAudience: project.targetAudience?.trim() || audienceAutofill,
      coreLoop: project.coreLoop?.trim() || coreLoopAutofill,
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
      marketSummary,
      opportunitySummary,
      riskSummary,
      audienceAutofill,
      coreLoopAutofill,
      suggestedGenres,
      suggestedTags,
      differentiators,
      metadata: {
        topCompetitorIds: topCompetitors.map((game) => game.id),
        topCompetitorNames: topCompetitors.map((game) => game.name)
      }
    },
    create: {
      projectId: project.id,
      matchingGamesCount: matchingGames.length,
      competitionCount,
      releaseMomentum,
      averageReviewScore,
      averagePriceCents,
      medianRevenueCents: BigInt(medianRevenueCents),
      marketSummary,
      opportunitySummary,
      riskSummary,
      audienceAutofill,
      coreLoopAutofill,
      suggestedGenres,
      suggestedTags,
      differentiators,
      metadata: {
        topCompetitorIds: topCompetitors.map((game) => game.id),
        topCompetitorNames: topCompetitors.map((game) => game.name)
      }
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

  return db.project.findUniqueOrThrow({
    where: {
      id: project.id
    },
    include: projectInclude
  });
}

export async function generateProjectGdd(projectId: string, workspaceId: string) {
  const project = await db.project.findFirstOrThrow({
    where: {
      id: projectId,
      workspaceId
    },
    include: {
      analysis: true,
      competitorGames: {
        include: {
          steamGame: true
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
  const competitorNames = project.competitorGames.map((item) => item.steamGame.name).slice(0, 6);
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
    "## Market Snapshot",
    analysis?.marketSummary || "Run market analysis to populate this section.",
    "",
    "## Opportunity Thesis",
    analysis?.opportunitySummary || "Opportunity thesis pending analysis.",
    "",
    "## Risks",
    analysis?.riskSummary || "Risk analysis pending.",
    "",
    "## Competitive Set",
    ...(competitorNames.length > 0 ? competitorNames.map((item, index) => `${index + 1}. ${item}`) : ["No competitor set has been attached yet."]),
    "",
    "## Production Pillars",
    `- Genre focus: ${project.genreInput || "TBD"}`,
    `- Tag focus: ${project.tagInput || "TBD"}`,
    `- Monetization: ${project.monetizationModel || "TBD"}`,
    `- Price target: ${project.pricePointCents ? (project.pricePointCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" }) : "TBD"}`,
    `- Art direction: ${project.artDirection || "TBD"}`,
    "",
    "## Next Validation Steps",
    "- Confirm the feature stack against the top Steam comps.",
    "- Tighten the fantasy and store positioning before production lock.",
    "- Keep market analysis updated as the concept evolves."
  ].join("\n");

  await db.projectGdd.create({
    data: {
      projectId: project.id,
      version: nextVersion,
      title: `${project.name} GDD v${nextVersion}`,
      content
    }
  });

  return db.project.findUniqueOrThrow({
    where: {
      id: project.id
    },
    include: projectInclude
  });
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

  return getProjectById(params.projectId, params.workspaceId);
}

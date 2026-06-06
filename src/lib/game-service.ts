import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { buildGameOpportunityProfile, buildSegmentIntelligence } from "@/lib/market-intelligence";

function revenueToNumber(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
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

export async function getGameSnapshots(appId: number) {
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
    take: 90
  });
}

export async function getPriceHistory(appId: number) {
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
    take: 180
  });
}

export async function getReviewHistory(appId: number) {
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
    take: 180
  });
}

export async function getPlayerHistory(appId: number) {
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
    take: 180
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
  const [
    trackedGames,
    recentLaunches,
    topRevenueGames,
    fastestGrowing,
    competitorSetsCount,
    projectsCount,
    analyzedProjectsCount,
    gddsCount,
    reportsCount,
    projectAnalyses
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
    }),
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
    },
    {
      id: "report",
      title: "Export a market report",
      description: "Generate a report and share it with your team.",
      href: "/reports",
      completed: reportsCount > 0
    }
  ];
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
    marketOverview: {
      totalGames: totals._count._all,
      averageReviewScore: totals._avg.reviewScore ?? 0,
      trackedGamesCount: trackedGames.length
    },
    guidedJourney: {
      completedSteps: completedJourneySteps,
      totalSteps: guidedJourneySteps.length,
      progressPercent: Math.round((completedJourneySteps / guidedJourneySteps.length) * 100),
      nextStep: guidedJourneySteps.find((step) => !step.completed) ?? null,
      steps: guidedJourneySteps
    },
    projectSignals: thesisSignals,
    portfolioReadiness,
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

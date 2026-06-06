import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

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
  const [trackedGames, recentLaunches, topRevenue, fastestGrowing] = await Promise.all([
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
    db.revenueEstimate.findMany({
      orderBy: {
        medianNetRevenueCents: "desc"
      },
      take: 10,
      include: {
        steamGame: {
          include: {
            priceCurrent: true
          }
        }
      }
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

  const totals = await db.steamGame.aggregate({
    _count: {
      _all: true
    },
    _avg: {
      reviewScore: true
    }
  });

  return {
    marketOverview: {
      totalGames: totals._count._all,
      averageReviewScore: totals._avg.reviewScore ?? 0,
      trackedGamesCount: trackedGames.length
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
    const revenue = game.revenueEstimates[0];
    const competitionCount = games.filter((candidate) =>
      candidate.genres.some((genre) =>
        game.genres.some((current) => current.steamGenreId === genre.steamGenreId)
      )
    ).length;
    const releaseMomentum = game.reviewCount ?? 0;
    const priceBand = game.priceCurrent?.finalPriceCents ?? 0;
    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (Math.min((revenue?.medianNetRevenueCents ?? 0) / 100000, 40) +
            (game.reviewScore ?? 0) * 0.3 +
            Math.max(0, 20 - competitionCount * 0.15) +
            Math.min(releaseMomentum / 50, 20) +
            Math.min(priceBand / 500, 10))
        )
      )
    );

    return {
      appId: game.appId,
      name: game.name,
      score,
      reviewScore: game.reviewScore,
      competitionCount,
      medianNetRevenueCents: revenue?.medianNetRevenueCents ?? 0,
      priceCents: priceBand
    };
  });

  return items.sort((a, b) => b.score - a.score).slice(0, 25);
}

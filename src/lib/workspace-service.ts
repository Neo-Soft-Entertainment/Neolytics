import { db } from "@/lib/db";

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
  workspaceId: string;
  steamGameId: string;
  userId: string;
}) {
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
    create: params
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

  return db.competitorSet.create({
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
}

export async function generateBasicMarketReport(params: {
  organizationId: string;
  workspaceId: string;
  createdById: string;
  title: string;
  genre?: string;
  tag?: string;
}) {
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
      revenueEstimates: {
        orderBy: {
          calculatedAt: "desc"
        },
        take: 1
      }
    },
    take: 10
  });

  const content = [
    `# ${params.title}`,
    "",
    "## Summary",
    `This report summarizes ${topGames.length} top Steam games${params.genre ? ` in the ${params.genre} segment` : ""}${params.tag ? ` tagged with ${params.tag}` : ""}.`,
    "",
    "## Top estimated net revenue titles",
    ...topGames.map((game, index) => {
      const revenue = Number(game.revenueEstimates[0]?.medianNetRevenueCents ?? 0n);
      return `${index + 1}. ${game.name} - estimated net revenue ${(revenue / 100).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
      })}`;
    })
  ].join("\n");

  return db.aiReport.create({
    data: {
      organizationId: params.organizationId,
      workspaceId: params.workspaceId,
      createdById: params.createdById,
      reportType: "MARKET",
      status: "READY",
      title: params.title,
      subject: params.genre ?? params.tag ?? "steam-market",
      content,
      metadata: {
        genre: params.genre,
        tag: params.tag,
        generatedAt: new Date().toISOString()
      }
    }
  });
}

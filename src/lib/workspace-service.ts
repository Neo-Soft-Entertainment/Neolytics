import { Prisma, SubscriptionPlan } from "@prisma/client";

import { appUrl } from "@/env";
import { db } from "@/lib/db";
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
            ? "Trate isso como uma aposta de crescimento em nível de board, mas inclua checkpoints de lançamento mais rigorosos e uma revisão de prontidão de produção mais forte."
            : "Trate isso como uma tese controlada. Busque um posicionamento mais claro antes de comprometer um grande orçamento de produção.",
        commercialDirective:
          segment.revenueConcentrationPercent >= 65
            ? "O planejamento comercial deve assumir uma prateleira em que poucos vencedores capturam a maior parte, então mensagem, qualidade da cápsula e timing de lançamento precisam ser melhores que a entrada mediana do segmento."
            : "O planejamento comercial pode sustentar um resultado intermediário, então a equipe pode vencer por foco, clareza e precificação disciplinada em vez de escopo blockbuster.",
        operatingDirective:
          segment.executionBarScore >= 70
            ? "Financeiro, aprovações e governança de milestones devem estar prontos antes do plano de produção escalar."
            : "A carga operacional é moderada o suficiente para sustentar uma estrutura de estúdio mais enxuta enquanto a tese ainda é provada."
      }
    : null;

  const content = [
    `# ${params.title}`,
    "",
    "## Resumo",
    `Este relatório resume ${topGames.length} jogos da Steam correspondentes${params.genre ? ` no segmento ${params.genre}` : ""}${params.tag ? ` com a tag ${params.tag}` : ""}.`,
    "",
    "## Profundidade de mercado",
    `- Tamanho do segmento: ${segment.segmentSize} jogos acompanhados`,
    `- Tamanho de mercado: ${segment.marketSizeLabel} (${(segment.marketSizeCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })})`,
    `- Receita mediana: ${(segment.medianRevenueCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`,
    `- Receita P75: ${(segment.p75RevenueCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`,
    `- Nota média das avaliações: ${segment.averageReviewScore.toFixed(1)}%`,
    `- Coortes de lançamento: ${segment.launches90} em 90d, ${segment.launches180} em 180d, ${segment.launches365} em 365d`,
    "",
    "## Camada competitiva",
    `- Score de saturação: ${segment.crowdednessScore}`,
    `- Concentração de receita: ${segment.revenueConcentrationPercent}% nos 3 líderes de receita`,
    `- Barra de qualidade: ${segment.qualityBarScore}`,
    `- Participação premium: ${segment.premiumSharePercent}%`,
    "",
    "## Camada de oportunidade",
    `- Score de oportunidade: ${segment.opportunityScore}`,
    `- Potencial de receita: ${segment.revenuePotentialScore}`,
    `- Score de nicho mal atendido: ${segment.underservedScore}`,
    `- Barra de execução: ${segment.executionBarScore}`,
    `- Score de risco: ${segment.riskScore}`,
    `- Confiança: ${segment.confidenceLabel} (${segment.confidenceScore})`,
    "",
    "## Leitura estratégica",
    segment.opportunityScore >= 70
      ? "Este segmento mostra upside forte e os dados sugerem espaço para uma entrada bem posicionada, mas a equipe ainda precisa superar uma barra de execução relevante."
      : "Este segmento é viável, mas os dados sugerem que a vantagem precisa vir de posicionamento e execução, não de um mercado estruturalmente aberto.",
    segment.revenueConcentrationPercent >= 65
      ? "A receita está concentrada em poucos líderes, então superar os vencedores em clareza de prateleira e qualidade é mais importante que apenas igualar o conjunto médio de features."
      : "A receita é relativamente distribuída pelo segmento, o que cria um caminho mais saudável para entradas intermediárias construírem negócio.",
    ...(aiNarrative
      ? [
          "",
          "## Leitura estratégica da IA",
          aiNarrative.executiveSummary,
          "",
          "### Gatilhos de demanda",
          aiNarrative.demandDrivers,
          "",
          "### Saturação",
          aiNarrative.saturationRead,
          "",
          "### Precificação",
          aiNarrative.pricingRead,
          "",
          "### Janela de lançamento",
          aiNarrative.launchWindowAdvice,
          "",
          "### Monetização",
          aiNarrative.monetizationRead,
          "",
          "### Confiança",
          aiNarrative.confidenceNarrative,
          "",
          "### Próximos movimentos recomendados",
          ...aiNarrative.actionItems.map((item) => `- ${item}`)
        ]
      : []),
    ...(operatingBrief
      ? [
          "",
          "## Brief operacional Pro",
          operatingBrief.boardDirective,
          "",
          "### Diretriz comercial",
          operatingBrief.commercialDirective,
          "",
          "### Diretriz operacional",
          operatingBrief.operatingDirective
        ]
      : []),
    "",
    "## Distribuição de preço",
    `- Abaixo de $10: ${segment.priceBandDistribution.under10}`,
    `- $10-$20: ${segment.priceBandDistribution.between10And20}`,
    `- $20-$30: ${segment.priceBandDistribution.between20And30}`,
    `- $30+: ${segment.priceBandDistribution.over30}`,
    "",
    "## Títulos com maior receita líquida estimada",
    ...leaders.map((game, index) => {
      const revenue = Number(game.revenueEstimates[0]?.medianNetRevenueCents ?? 0n);
      return `${index + 1}. ${game.name} - receita líquida estimada ${(revenue / 100).toLocaleString("en-US", {
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
    content: `Relatório de mercado **${report.title}** pronto na Neolytics.`,
    embeds: [
      {
        title: "Relatório de mercado gerado",
        description: `Abra ${appUrl}/reports para revisar **${report.title}**.`,
        color: 10181046,
        timestamp: new Date().toISOString()
      }
    ]
  });

  return report;
}

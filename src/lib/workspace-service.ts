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
        create: games.map((game: any) => ({
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

type MarketReportGame = {
  name: string;
  isFree: boolean;
  releaseDate: Date | null;
  reviewScore: number | null;
  reviewCount: number | null;
  priceCurrent: {
    finalPriceCents: number | null;
  } | null;
  revenueEstimates: Array<{
    medianNetRevenueCents: bigint | number;
  }>;
  genres: Array<{
    steamGenre: {
      name: string;
    };
  }>;
  tags: Array<{
    steamTag: {
      name: string;
    };
  }>;
};

function reportMoney(valueCents: number) {
  return (valueCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
}

function reportGameRevenue(game: MarketReportGame) {
  return Number(game.revenueEstimates[0]?.medianNetRevenueCents ?? 0n);
}

function reportGamePrice(game: MarketReportGame) {
  if (game.isFree) {
    return "free-to-play";
  }

  const price = game.priceCurrent?.finalPriceCents ?? 0;

    let resolvedValue0: any;
  if (price > 0) {
    resolvedValue0 = reportMoney(price);
  } else {
    resolvedValue0 = "sem preço visível";
  }
return resolvedValue0;
}

function reportTopTerms(games: MarketReportGame[], field: "genres" | "tags") {
  const counts = new Map<string, number>();

  for (const game of games) {
        let resolvedValue1: any;
    if (field === "genres") {
      resolvedValue1 = game.genres.map((genre: any) => genre.steamGenre.name);
    } else {
      resolvedValue1 = game.tags.map((tag: any) => tag.steamTag.name);
    }
const terms = resolvedValue1;

    for (const term of terms) {
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));
}

function reportGameLine(game: MarketReportGame, index: number) {
  const revenue = reportGameRevenue(game);
    let resolvedValue2: any;
  if (game.reviewScore !== null) {
    resolvedValue2 = `${game.reviewScore}%`;
  } else {
    resolvedValue2 = "sem nota";
  }
const score = resolvedValue2;
  const reviews = game.reviewCount?.toLocaleString("en-US") ?? "0";

  return `${index + 1}. ${game.name} - ${reportMoney(revenue)} receita estimada, ${score}, ${reviews} reviews, ${reportGamePrice(game)}`;
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
    let resolvedValue3: any;
  if (params.genre) {
    resolvedValue3 = {
            genres: {
              some: {
                steamGenre: {
                  slug: params.genre
                }
              }
            }
          };
  } else {
    resolvedValue3 = {};
  }
  let resolvedValue4: any;
  if (params.tag) {
    resolvedValue4 = {
            tags: {
              some: {
                steamTag: {
                  slug: params.tag
                }
              }
            }
          };
  } else {
    resolvedValue4 = {};
  }
const topGames = await db.steamGame.findMany({
    where: {
      ...(resolvedValue3),
      ...(resolvedValue4)
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
  const segment = buildSegmentIntelligence(topGames);
  const leaders = [...topGames]
    .sort((left, right) => Number(right.revenueEstimates[0]?.medianNetRevenueCents ?? 0n) - Number(left.revenueEstimates[0]?.medianNetRevenueCents ?? 0n))
    .slice(0, 10);
  const aiNarrative = await generateAiSegmentReportLayer({
    title: params.title,
    genre: params.genre,
    tag: params.tag,
    segment,
    leaders: leaders.map((game: any) => ({
      name: game.name,
      priceCents: game.priceCurrent?.finalPriceCents ?? null,
      reviewScore: game.reviewScore,
      reviewCount: game.reviewCount,
      medianRevenueCents: Number(game.revenueEstimates[0]?.medianNetRevenueCents ?? 0n),
      genres: game.genres.map((genre: any) => genre.steamGenre.name),
      tags: game.tags.map((tag: any) => tag.steamTag.name)
    }))
  });
    let resolvedValue5: any;
  if (params.genre) {
    resolvedValue5 = `gênero ${params.genre}`;
  } else {
    resolvedValue5 = null;
  }
  let resolvedValue6: any;
  if (params.tag) {
    resolvedValue6 = `tag ${params.tag}`;
  } else {
    resolvedValue6 = null;
  }
const segmentName = [resolvedValue5, resolvedValue6].filter(Boolean).join(" + ") || "mercado Steam analisado";
  const revenueLeaders = [...topGames].sort((left, right) => reportGameRevenue(right) - reportGameRevenue(left));
  const demandLeaders = [...topGames].sort((left, right) => (right.reviewCount ?? 0) - (left.reviewCount ?? 0)).slice(0, 5);
  const topTags = reportTopTerms(topGames, "tags");
  const topGenres = reportTopTerms(topGames, "genres");
  const qualityGaps = [...topGames]
    .filter((game: any) => (game.reviewScore ?? 0) >= Math.max(78, segment.averageReviewScore) && reportGameRevenue(game) > 0 && reportGameRevenue(game) <= Math.max(segment.medianRevenueCents, 1))
    .sort((left, right) => (right.reviewScore ?? 0) - (left.reviewScore ?? 0))
    .slice(0, 5);
  const expensiveWeakSpots = revenueLeaders
    .filter((game: any) => reportGameRevenue(game) > 0 && (game.reviewScore ?? 100) < Math.max(70, segment.averageReviewScore - 5))
    .slice(0, 5);
  const priceBands = [
    { label: "abaixo de $10", count: segment.priceBandDistribution.under10 },
    { label: "$10-$20", count: segment.priceBandDistribution.between10And20 },
    { label: "$20-$30", count: segment.priceBandDistribution.between20And30 },
    { label: "$30+", count: segment.priceBandDistribution.over30 }
  ];
  const dominantPriceBand = [...priceBands].sort((left, right) => right.count - left.count)[0]?.label ?? "sem padrão claro";
    let resolvedValue7: any;
  if (topGames.length === 0) {
    resolvedValue7 = "Não tomar decisão de produção: não há comparáveis suficientes para sustentar uma tese.";
  } else {
        let resolvedValue20: any;
    if (segment.opportunityScore >= 70 && segment.riskScore < 55) {
      resolvedValue20 = "Avançar para protótipo comercial focado, com escopo pequeno e teste de página Steam antes de ampliar produção.";
    } else {
            let resolvedValue25: any;
      if (segment.opportunityScore >= 55) {
        resolvedValue25 = "Manter como tese condicional: validar posicionamento, cápsula e preço antes de aprovar produção completa.";
      } else {
        resolvedValue25 = "Não escalar produção agora: usar o segmento apenas como referência até encontrar uma lacuna mais clara.";
      }
resolvedValue20 = resolvedValue25;
    }
resolvedValue7 = resolvedValue20;
  }
const decisionRecommendation = resolvedValue7;
    let resolvedValue8: any;
  if (topTags.length > 0) {
    resolvedValue8 = `A prateleira parece responder a ${topTags.slice(0, 3).map((term) => term.name).join(", ")}; a entrada precisa prometer uma diferença legível dentro desse vocabulário em vez de tentar competir genericamente.`;
  } else {
    resolvedValue8 = "A amostra não mostra tags recorrentes suficientes; a primeira tarefa é melhorar o recorte do segmento.";
  }
const marketThesis = resolvedValue8;
    let resolvedValue9: any;
  if (segment.revenueConcentrationPercent >= 65) {
    resolvedValue9 = `Risco principal: winner-takes-most. Os 3 líderes concentram ${segment.revenueConcentrationPercent}% da receita estimada, então uma entrada mediana tende a desaparecer.`;
  } else {
        let resolvedValue21: any;
    if (segment.averageReviewScore < 72) {
      resolvedValue21 = `Risco principal: baixa satisfação média (${segment.averageReviewScore.toFixed(1)}%). O segmento pode ter demanda, mas o produto precisa provar qualidade cedo.`;
    } else {
      resolvedValue21 = `Risco principal: diferenciação. O segmento não parece impossível, mas exige uma promessa clara para não virar mais um comparável.`;
    }
resolvedValue9 = resolvedValue21;
  }
const mainRisk = resolvedValue9;
  const nextMoves = [
    `Montar uma página Steam fake ou rascunho com promessa baseada em ${topTags[0]?.name ?? params.tag ?? params.genre ?? "o principal sinal de demanda"} e medir CTR/wishlist.`,
    `Comparar a cápsula e primeira frase contra ${revenueLeaders[0]?.name ?? "o líder do segmento"} e ${demandLeaders[0]?.name ?? "o jogo com mais reviews"}.`,
    `Testar preço em ${dominantPriceBand} ou justificar explicitamente qualquer desvio.`,
    "Criar um protótipo de 10-15 minutos que prove o diferencial, não o escopo completo."
  ];
  const decisionBrief = {
    recommendation: decisionRecommendation,
    marketThesis,
    mainRisk,
    nextMoves
  };
    let resolvedValue10: any;
  if (isProPlan) {
        let resolvedValue22: any;
    if (segment.opportunityScore >= 70) {
      resolvedValue22 = "Trate isso como uma aposta de crescimento em nível de board, mas inclua checkpoints de lançamento mais rigorosos e uma revisão de prontidão de produção mais forte.";
    } else {
      resolvedValue22 = "Trate isso como uma tese controlada. Busque um posicionamento mais claro antes de comprometer um grande orçamento de produção.";
    }
    let resolvedValue23: any;
    if (segment.revenueConcentrationPercent >= 65) {
      resolvedValue23 = "O planejamento comercial deve assumir uma prateleira em que poucos vencedores capturam a maior parte, então mensagem, qualidade da cápsula e timing de lançamento precisam ser melhores que a entrada mediana do segmento.";
    } else {
      resolvedValue23 = "O planejamento comercial pode sustentar um resultado intermediário, então a equipe pode vencer por foco, clareza e precificação disciplinada em vez de escopo blockbuster.";
    }
    let resolvedValue24: any;
    if (segment.executionBarScore >= 70) {
      resolvedValue24 = "Financeiro, aprovações e governança de milestones devem estar prontos antes do plano de produção escalar.";
    } else {
      resolvedValue24 = "A carga operacional é moderada o suficiente para sustentar uma estrutura de estúdio mais enxuta enquanto a tese ainda é provada.";
    }
resolvedValue10 = {
        boardDirective:
          resolvedValue22,
        commercialDirective:
          resolvedValue23,
        operatingDirective:
          resolvedValue24
      };
  } else {
    resolvedValue10 = null;
  }
const operatingBrief = resolvedValue10;

    let resolvedValue11: any;
  if (revenueLeaders.length > 0) {
    resolvedValue11 = `Os líderes de receita para este recorte são ${revenueLeaders.slice(0, 3).map((game: any) => game.name).join(", ")}. Eles definem a barra comercial, não a média do segmento.`;
  } else {
    resolvedValue11 = "Não há líderes claros porque a amostra não trouxe receita estimada suficiente.";
  }
  let resolvedValue12: any;
  if (demandLeaders.length > 0) {
    resolvedValue12 = `Os jogos com mais prova pública de demanda são ${demandLeaders.slice(0, 3).map((game: any) => game.name).join(", ")}. Use-os para entender promessa de loja, volume de reviews e expectativa de comunidade.`;
  } else {
    resolvedValue12 = "Não há demanda pública suficiente na amostra para formar tese.";
  }
  let resolvedValue14: any;
  if (topTags.length > 0) {
    resolvedValue14 = topTags.map((term) => `${term.name} (${term.count})`).join(", ");
  } else {
    resolvedValue14 = "sem padrão forte";
  }
  let resolvedValue15: any;
  if (topGenres.length > 0) {
    resolvedValue15 = topGenres.map((term) => `${term.name} (${term.count})`).join(", ");
  } else {
    resolvedValue15 = "sem padrão forte";
  }
  let resolvedValue16: any;
  if (qualityGaps.length > 0) {
    resolvedValue16 = "Há jogos bem avaliados abaixo da mediana de receita. Isso pode indicar lacuna de marketing, cápsula, timing ou escala comercial, não necessariamente falta de demanda.";
  } else {
    resolvedValue16 = "A amostra não mostrou uma lacuna óbvia de jogos muito bem avaliados e submonetizados.";
  }
  let resolvedValue17: any;
  if (expensiveWeakSpots.length > 0) {
    resolvedValue17 = "Também existem líderes de receita com avaliação fraca. Se forem relevantes para a sua tese, a oportunidade pode estar em entregar melhor satisfação sem copiar escopo.";
  } else {
    resolvedValue17 = "Não há líderes grandes com avaliação fraca o bastante para virar uma tese óbvia de 'fazer melhor'.";
  }
  let resolvedValue18: any;
  if (aiNarrative) {
    resolvedValue18 = [
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
          ...aiNarrative.actionItems.map((item: any) => `- ${item}`)
        ];
  } else {
    resolvedValue18 = [];
  }
  let resolvedValue19: any;
  if (operatingBrief) {
    resolvedValue19 = [
          "",
          "## Brief operacional Pro",
          operatingBrief.boardDirective,
          "",
          "### Diretriz comercial",
          operatingBrief.commercialDirective,
          "",
          "### Diretriz operacional",
          operatingBrief.operatingDirective
        ];
  } else {
    resolvedValue19 = [];
  }
const content = [
    `# ${params.title}`,
    "",
    "## Decisão executiva",
    `**Recomendação:** ${decisionRecommendation}`,
    `**Tese de mercado:** ${marketThesis}`,
    `**Risco real:** ${mainRisk}`,
    "",
    "## O que fazer agora",
    ...nextMoves.map((item: any) => `- ${item}`),
    "",
    "## Comparáveis que realmente importam",
    resolvedValue11,
    ...revenueLeaders.slice(0, 5).map(reportGameLine),
    "",
    "## Demanda visível",
    resolvedValue12,
    ...demandLeaders.map((game, index) => {
            let resolvedValue13: any;
      if (game.releaseDate) {
        resolvedValue13 = game.releaseDate.toISOString().slice(0, 10);
      } else {
        resolvedValue13 = "data desconhecida";
      }
const release = resolvedValue13;
      return `${index + 1}. ${game.name} - ${(game.reviewCount ?? 0).toLocaleString("en-US")} reviews, ${game.reviewScore ?? "sem nota"}%, lançado em ${release}`;
    }),
    "",
    "## Vocabulário de posicionamento",
    `- Tags recorrentes: ${resolvedValue14}`,
    `- Gêneros recorrentes: ${resolvedValue15}`,
    `- Faixa de preço dominante: ${dominantPriceBand}`,
    "",
    "## Lacunas e alertas",
    resolvedValue16,
    ...qualityGaps.map((game, index) => reportGameLine(game, index)),
    resolvedValue17,
    ...expensiveWeakSpots.map((game, index) => reportGameLine(game, index)),
    "",
    "## Critérios de corte",
    "- Corte a tese se a página/cápsula não explicar a diferença em uma frase.",
    `- Corte ou reduza escopo se o protótipo não provar o diferencial contra ${revenueLeaders[0]?.name ?? "o líder do segmento"}.`,
    `- Corte a tese se o preço pretendido fugir de ${dominantPriceBand} sem uma justificativa de valor evidente.`,
    "- Não use tamanho de mercado como aprovação automática; use como limite superior de ambição.",
    "",
    "## Profundidade de mercado",
    `- Tamanho do segmento: ${segment.segmentSize} jogos acompanhados`,
    `- Tamanho de mercado: ${segment.marketSizeLabel} (${reportMoney(segment.marketSizeCents)})`,
    `- Receita mediana: ${reportMoney(segment.medianRevenueCents)}`,
    `- Receita P75: ${reportMoney(segment.p75RevenueCents)}`,
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
    `Este relatório analisou ${topGames.length} jogos para ${segmentName}. A decisão acima deve guiar produção, marketing e orçamento antes de qualquer expansão de escopo.`,
    ...(resolvedValue18),
    ...(resolvedValue19),
    "",
    "## Distribuição de preço",
    `- Abaixo de $10: ${segment.priceBandDistribution.under10}`,
    `- $10-$20: ${segment.priceBandDistribution.between10And20}`,
    `- $20-$30: ${segment.priceBandDistribution.between20And30}`,
    `- $30+: ${segment.priceBandDistribution.over30}`,
    "",
    "## Títulos com maior receita líquida estimada",
    ...leaders.map(reportGameLine)
  ].join("\n");
  const reportMetadata = {
    genre: params.genre,
    tag: params.tag,
    generatedAt: new Date().toISOString(),
    segment,
    decisionBrief,
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

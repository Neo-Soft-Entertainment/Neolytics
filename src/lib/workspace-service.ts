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

  return price > 0 ? reportMoney(price) : "sem preço visível";
}

function reportTopTerms(games: MarketReportGame[], field: "genres" | "tags") {
  const counts = new Map<string, number>();

  for (const game of games) {
    const terms = field === "genres"
      ? game.genres.map((genre) => genre.steamGenre.name)
      : game.tags.map((tag) => tag.steamTag.name);

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
  const score = game.reviewScore !== null ? `${game.reviewScore}%` : "sem nota";
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
  const segmentName = [params.genre ? `gênero ${params.genre}` : null, params.tag ? `tag ${params.tag}` : null].filter(Boolean).join(" + ") || "mercado Steam analisado";
  const revenueLeaders = [...topGames].sort((left, right) => reportGameRevenue(right) - reportGameRevenue(left));
  const demandLeaders = [...topGames].sort((left, right) => (right.reviewCount ?? 0) - (left.reviewCount ?? 0)).slice(0, 5);
  const topTags = reportTopTerms(topGames, "tags");
  const topGenres = reportTopTerms(topGames, "genres");
  const qualityGaps = [...topGames]
    .filter((game) => (game.reviewScore ?? 0) >= Math.max(78, segment.averageReviewScore) && reportGameRevenue(game) > 0 && reportGameRevenue(game) <= Math.max(segment.medianRevenueCents, 1))
    .sort((left, right) => (right.reviewScore ?? 0) - (left.reviewScore ?? 0))
    .slice(0, 5);
  const expensiveWeakSpots = revenueLeaders
    .filter((game) => reportGameRevenue(game) > 0 && (game.reviewScore ?? 100) < Math.max(70, segment.averageReviewScore - 5))
    .slice(0, 5);
  const priceBands = [
    { label: "abaixo de $10", count: segment.priceBandDistribution.under10 },
    { label: "$10-$20", count: segment.priceBandDistribution.between10And20 },
    { label: "$20-$30", count: segment.priceBandDistribution.between20And30 },
    { label: "$30+", count: segment.priceBandDistribution.over30 }
  ];
  const dominantPriceBand = [...priceBands].sort((left, right) => right.count - left.count)[0]?.label ?? "sem padrão claro";
  const decisionRecommendation = topGames.length === 0
    ? "Não tomar decisão de produção: não há comparáveis suficientes para sustentar uma tese."
    : segment.opportunityScore >= 70 && segment.riskScore < 55
      ? "Avançar para protótipo comercial focado, com escopo pequeno e teste de página Steam antes de ampliar produção."
      : segment.opportunityScore >= 55
        ? "Manter como tese condicional: validar posicionamento, cápsula e preço antes de aprovar produção completa."
        : "Não escalar produção agora: usar o segmento apenas como referência até encontrar uma lacuna mais clara.";
  const marketThesis = topTags.length > 0
    ? `A prateleira parece responder a ${topTags.slice(0, 3).map((term) => term.name).join(", ")}; a entrada precisa prometer uma diferença legível dentro desse vocabulário em vez de tentar competir genericamente.`
    : "A amostra não mostra tags recorrentes suficientes; a primeira tarefa é melhorar o recorte do segmento.";
  const mainRisk = segment.revenueConcentrationPercent >= 65
    ? `Risco principal: winner-takes-most. Os 3 líderes concentram ${segment.revenueConcentrationPercent}% da receita estimada, então uma entrada mediana tende a desaparecer.`
    : segment.averageReviewScore < 72
      ? `Risco principal: baixa satisfação média (${segment.averageReviewScore.toFixed(1)}%). O segmento pode ter demanda, mas o produto precisa provar qualidade cedo.`
      : `Risco principal: diferenciação. O segmento não parece impossível, mas exige uma promessa clara para não virar mais um comparável.`;
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
    "## Decisão executiva",
    `**Recomendação:** ${decisionRecommendation}`,
    `**Tese de mercado:** ${marketThesis}`,
    `**Risco real:** ${mainRisk}`,
    "",
    "## O que fazer agora",
    ...nextMoves.map((item) => `- ${item}`),
    "",
    "## Comparáveis que realmente importam",
    revenueLeaders.length > 0
      ? `Os líderes de receita para este recorte são ${revenueLeaders.slice(0, 3).map((game) => game.name).join(", ")}. Eles definem a barra comercial, não a média do segmento.`
      : "Não há líderes claros porque a amostra não trouxe receita estimada suficiente.",
    ...revenueLeaders.slice(0, 5).map(reportGameLine),
    "",
    "## Demanda visível",
    demandLeaders.length > 0
      ? `Os jogos com mais prova pública de demanda são ${demandLeaders.slice(0, 3).map((game) => game.name).join(", ")}. Use-os para entender promessa de loja, volume de reviews e expectativa de comunidade.`
      : "Não há demanda pública suficiente na amostra para formar tese.",
    ...demandLeaders.map((game, index) => {
      const release = game.releaseDate ? game.releaseDate.toISOString().slice(0, 10) : "data desconhecida";
      return `${index + 1}. ${game.name} - ${(game.reviewCount ?? 0).toLocaleString("en-US")} reviews, ${game.reviewScore ?? "sem nota"}%, lançado em ${release}`;
    }),
    "",
    "## Vocabulário de posicionamento",
    `- Tags recorrentes: ${topTags.length > 0 ? topTags.map((term) => `${term.name} (${term.count})`).join(", ") : "sem padrão forte"}`,
    `- Gêneros recorrentes: ${topGenres.length > 0 ? topGenres.map((term) => `${term.name} (${term.count})`).join(", ") : "sem padrão forte"}`,
    `- Faixa de preço dominante: ${dominantPriceBand}`,
    "",
    "## Lacunas e alertas",
    qualityGaps.length > 0
      ? "Há jogos bem avaliados abaixo da mediana de receita. Isso pode indicar lacuna de marketing, cápsula, timing ou escala comercial, não necessariamente falta de demanda."
      : "A amostra não mostrou uma lacuna óbvia de jogos muito bem avaliados e submonetizados.",
    ...qualityGaps.map((game, index) => reportGameLine(game, index)),
    expensiveWeakSpots.length > 0
      ? "Também existem líderes de receita com avaliação fraca. Se forem relevantes para a sua tese, a oportunidade pode estar em entregar melhor satisfação sem copiar escopo."
      : "Não há líderes grandes com avaliação fraca o bastante para virar uma tese óbvia de 'fazer melhor'.",
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

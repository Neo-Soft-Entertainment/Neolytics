import { SteamGame } from "@prisma/client";

type ComparableGame = SteamGame & {
  reviewScore: number | null;
  reviewCount: number | null;
  releaseDate: Date | null;
  priceCurrent: {
    finalPriceCents: number | null;
  } | null;
  revenueEstimates: Array<{
    medianNetRevenueCents: bigint | number;
  }>;
  genres: Array<{
    steamGenre: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  tags: Array<{
    steamTag: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
};

type RankedComparableGame = ComparableGame & {
  similarityScore: number;
  genreMatches: number;
  tagMatches: number;
  isDirectComparable: boolean;
};

type TimeSeriesReviewSnapshot = {
  steamGameId: string;
  snapshotDate: Date;
  totalReviews: number;
};

type TimeSeriesPlayerSnapshot = {
  steamGameId: string;
  snapshotDate: Date;
  currentPlayers: number;
};

type ProjectMarketInput = {
  name: string;
  genreInput: string | null;
  tagInput: string | null;
  elevatorPitch?: string | null;
  description?: string | null;
  differentiator?: string | null;
  playerFantasy?: string | null;
  targetAudience?: string | null;
  coreLoop?: string | null;
  monetizationModel?: string | null;
  pricePointCents?: number | null;
};

function formatMoney(valueCents: number) {
  if (valueCents <= 0) {
    return "unknown";
  }

  return (valueCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
}

function getScoreLabel(score: number) {
  if (score >= 75) {
    return "High";
  }

  if (score >= 55) {
    return "Medium";
  }

  return "Low";
}

function getOpportunityClassification(opportunityScore: number, demandScore: number, competitionScore: number, growthScore: number, saturationScore: number) {
  if (opportunityScore >= 76 && demandScore >= 65 && saturationScore < 70) {
    return "High probability opportunity";
  }

  if (growthScore >= 70 && competitionScore < 65) {
    return "Emerging trend category";
  }

  if (demandScore >= 70 && competitionScore >= 70) {
    return "High competition but strong demand";
  }

  if (competitionScore < 45 && demandScore < 55) {
    return "Low competition but limited audience";
  }

  if (saturationScore >= 75) {
    return "Oversaturated segment";
  }

  return "Medium confidence niche market";
}

function getLatestByGame<T extends { steamGameId: string; snapshotDate: Date }>(snapshots: T[]) {
  const groups = new Map<string, T[]>();

  for (const snapshot of snapshots) {
    groups.set(snapshot.steamGameId, [...(groups.get(snapshot.steamGameId) ?? []), snapshot]);
  }

  return Array.from(groups.entries()).map(([steamGameId, values]) => {
    const sorted = values.sort((left, right) => left.snapshotDate.getTime() - right.snapshotDate.getTime());
    return {
      steamGameId,
      first: sorted[0],
      latest: sorted[sorted.length - 1]
    };
  });
}

function getReviewVelocity(snapshots: TimeSeriesReviewSnapshot[]) {
  return getLatestByGame(snapshots)
    .map((group) => Math.max(0, group.latest.totalReviews - group.first.totalReviews))
    .filter((value) => value > 0);
}

function getPlayerMomentum(snapshots: TimeSeriesPlayerSnapshot[]) {
  return getLatestByGame(snapshots)
    .map((group) => Math.max(0, group.latest.currentPlayers - group.first.currentPlayers))
    .filter((value) => value > 0);
}

function getTopTags(games: RankedComparableGame[], limit = 8) {
  const counts = new Map<string, { name: string; count: number; directCount: number }>();

  for (const game of games) {
    for (const tag of game.tags) {
      const current = counts.get(tag.steamTag.slug) ?? { name: tag.steamTag.name, count: 0, directCount: 0 };
      current.count += 1;
      current.directCount += game.isDirectComparable ? 1 : 0;
      counts.set(tag.steamTag.slug, current);
    }
  }

  return Array.from(counts.values())
    .sort((left, right) => right.directCount - left.directCount || right.count - left.count)
    .slice(0, limit);
}

function getRevenueRange(revenueValues: number[]) {
  return {
    lowCents: percentile(revenueValues, 0.25),
    medianCents: median(revenueValues),
    highCents: percentile(revenueValues, 0.75)
  };
}

function summarizeEvidence(metrics: Record<string, string | number>) {
  return Object.entries(metrics).map(([key, value]) => `${key}: ${value}`).join(" · ");
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentileValue) - 1));

  return sorted[index];
}

function clampScore(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function revenueToNumber(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function getPriceBandDistribution(values: number[]) {
  return {
    under10: values.filter((value) => value < 1000).length,
    between10And20: values.filter((value) => value >= 1000 && value < 2000).length,
    between20And30: values.filter((value) => value >= 2000 && value < 3000).length,
    over30: values.filter((value) => value >= 3000).length
  };
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

function getConfidenceLabel(score: number) {
  if (score >= 80) {
    return "High";
  }

  if (score >= 60) {
    return "Medium";
  }

  return "Low";
}

export function buildSegmentIntelligence(games: ComparableGame[]) {
  const now = Date.now();
  const revenueValues = games
    .map((game) => revenueToNumber(game.revenueEstimates[0]?.medianNetRevenueCents))
    .filter((value) => value > 0);
  const priceValues = games
    .map((game) => game.priceCurrent?.finalPriceCents ?? 0)
    .filter((value) => value > 0);
  const reviewScores = games
    .map((game) => game.reviewScore ?? 0)
    .filter((value) => value > 0);
  const reviewCounts = games
    .map((game) => game.reviewCount ?? 0)
    .filter((value) => value > 0);
  const launches90 = games.filter((game) => game.releaseDate && now - game.releaseDate.getTime() <= 90 * 24 * 60 * 60 * 1000).length;
  const launches180 = games.filter((game) => game.releaseDate && now - game.releaseDate.getTime() <= 180 * 24 * 60 * 60 * 1000).length;
  const launches365 = games.filter((game) => game.releaseDate && now - game.releaseDate.getTime() <= 365 * 24 * 60 * 60 * 1000).length;
  const totalRevenueCents = revenueValues.reduce((sum, value) => sum + value, 0);
  const top3RevenueCents = [...revenueValues].sort((left, right) => right - left).slice(0, 3).reduce((sum, value) => sum + value, 0);
  const revenueConcentrationPercent = totalRevenueCents > 0 ? Math.round((top3RevenueCents / totalRevenueCents) * 100) : 0;
  const averageReviewScore = reviewScores.length > 0 ? Number(average(reviewScores).toFixed(1)) : 0;
  const averagePriceCents = priceValues.length > 0 ? Math.round(average(priceValues)) : 0;
  const medianRevenueCents = median(revenueValues);
  const p75RevenueCents = percentile(revenueValues, 0.75);
  const medianPriceCents = median(priceValues);
  const priceBandDistribution = getPriceBandDistribution(priceValues);
  const freeCount = games.filter((game) => game.isFree).length;
  const premiumSharePercent = games.length > 0 ? Math.round(((games.length - freeCount) / games.length) * 100) : 0;
  const qualityBarScore = reviewScores.length > 0 ? clampScore(percentile(reviewScores, 0.75)) : 0;
  const launchDensityScore = games.length > 0 ? clampScore((launches180 / games.length) * 100) : 0;
  const crowdednessScore = clampScore(games.length * 4 + launchDensityScore * 0.35);
  const reviewVelocityScore = clampScore(reviewCounts.length > 0 ? average(reviewCounts) / 50 : 0);
  const revenuePotentialScore = clampScore(
    (medianRevenueCents > 0 ? Math.min(45, medianRevenueCents / 4_000_000) : 0)
    + (p75RevenueCents > 0 ? Math.min(35, p75RevenueCents / 10_000_000) : 0)
    + Math.min(20, reviewVelocityScore * 0.2)
  );
  const underservedScore = clampScore(
    revenuePotentialScore * 0.4
    + Math.max(0, 100 - crowdednessScore) * 0.3
    + Math.max(0, 100 - revenueConcentrationPercent) * 0.15
    + Math.max(0, 100 - qualityBarScore) * 0.15
  );
  const executionBarScore = clampScore(
    qualityBarScore * 0.55
    + crowdednessScore * 0.25
    + revenueConcentrationPercent * 0.2
  );
  const riskScore = clampScore(
    Math.max(0, 100 - averageReviewScore) * 0.35
    + crowdednessScore * 0.25
    + revenueConcentrationPercent * 0.25
    + Math.max(0, 100 - revenuePotentialScore) * 0.15
  );
  const opportunityScore = clampScore(
    revenuePotentialScore * 0.35
    + underservedScore * 0.35
    + Math.max(0, 100 - riskScore) * 0.15
    + Math.max(0, 100 - executionBarScore) * 0.15
  );
  const confidenceCoverage = [
    revenueValues.length >= Math.max(3, Math.floor(games.length * 0.35)),
    priceValues.length >= Math.max(3, Math.floor(games.length * 0.5)),
    reviewScores.length >= Math.max(3, Math.floor(games.length * 0.6))
  ];
  const confidenceScore = clampScore((confidenceCoverage.filter(Boolean).length / confidenceCoverage.length) * 100);

  return {
    segmentSize: games.length,
    marketSizeCents: totalRevenueCents,
    marketSizeLabel: getMarketSizeLabel(totalRevenueCents),
    medianRevenueCents,
    p75RevenueCents,
    averagePriceCents,
    medianPriceCents,
    averageReviewScore,
    qualityBarScore,
    launches90,
    launches180,
    launches365,
    launchDensityScore,
    premiumSharePercent,
    priceBandDistribution,
    revenueConcentrationPercent,
    crowdednessScore,
    underservedScore,
    revenuePotentialScore,
    executionBarScore,
    riskScore,
    opportunityScore,
    confidenceScore,
    confidenceLabel: getConfidenceLabel(confidenceScore)
  };
}

export function buildGameOpportunityProfile(
  game: ComparableGame,
  peers: ComparableGame[]
) {
  const segment = buildSegmentIntelligence(peers);
  const medianRevenue = revenueToNumber(game.revenueEstimates[0]?.medianNetRevenueCents);
  const priceCents = game.priceCurrent?.finalPriceCents ?? 0;
  const revenueFit = segment.medianRevenueCents > 0
    ? clampScore((medianRevenue / segment.medianRevenueCents) * 60, 0, 100)
    : 50;
  const priceFit = segment.medianPriceCents > 0
    ? clampScore(100 - (Math.abs(priceCents - segment.medianPriceCents) / segment.medianPriceCents) * 100)
    : 60;
  const reviewFit = clampScore(game.reviewScore ?? segment.averageReviewScore ?? 0);
  const opportunityScore = clampScore(
    segment.opportunityScore * 0.45
    + revenueFit * 0.2
    + reviewFit * 0.2
    + priceFit * 0.15
  );

  return {
    ...segment,
    opportunityScore,
    reviewFit,
    revenueFit,
    priceFit
  };
}

export function buildHybridMarketIntelligence(input: {
  project: ProjectMarketInput;
  rankedComparables: RankedComparableGame[];
  directComparables: RankedComparableGame[];
  adjacentComparables: RankedComparableGame[];
  reviewSnapshots: TimeSeriesReviewSnapshot[];
  playerSnapshots: TimeSeriesPlayerSnapshot[];
  medianPriceCents: number;
  averageReviewScore: number | null;
  revenueConcentrationPercent: number;
  premiumSharePercent: number;
  confidenceScore: number;
  confidenceLabel: string;
}) {
  const games = input.rankedComparables;
  const now = Date.now();
  const revenueValues = games
    .map((game) => revenueToNumber(game.revenueEstimates[0]?.medianNetRevenueCents))
    .filter((value) => value > 0);
  const priceValues = games
    .map((game) => game.priceCurrent?.finalPriceCents ?? 0)
    .filter((value) => value > 0);
  const reviewCounts = games
    .map((game) => game.reviewCount ?? 0)
    .filter((value) => value > 0);
  const reviewScores = games
    .map((game) => game.reviewScore ?? 0)
    .filter((value) => value > 0);
  const launches90 = games.filter((game) => game.releaseDate && now - game.releaseDate.getTime() <= 90 * 24 * 60 * 60 * 1000).length;
  const launches180 = games.filter((game) => game.releaseDate && now - game.releaseDate.getTime() <= 180 * 24 * 60 * 60 * 1000).length;
  const launches365 = games.filter((game) => game.releaseDate && now - game.releaseDate.getTime() <= 365 * 24 * 60 * 60 * 1000).length;
  const launchesOlder = games.filter((game) => game.releaseDate && now - game.releaseDate.getTime() > 365 * 24 * 60 * 60 * 1000).length;
  const reviewVelocityValues = getReviewVelocity(input.reviewSnapshots);
  const playerMomentumValues = getPlayerMomentum(input.playerSnapshots);
  const revenueRange = getRevenueRange(revenueValues);
  const p90RevenueCents = percentile(revenueValues, 0.9);
  const averageReviewCount = average(reviewCounts);
  const medianReviewCount = median(reviewCounts);
  const medianReviewVelocity = median(reviewVelocityValues);
  const medianPlayerMomentum = median(playerMomentumValues);
  const launchTrendRatio = launchesOlder > 0 ? launches365 / launchesOlder : launches365 > 0 ? 1 : 0;
  const demandScore = clampScore(
    Math.min(35, medianReviewCount / 80)
    + Math.min(25, medianReviewVelocity / 8)
    + Math.min(25, revenueRange.medianCents / 4_000_000)
    + Math.min(15, medianPlayerMomentum / 30)
  );
  const competitionScore = clampScore(
    input.directComparables.length * 9
    + input.adjacentComparables.length * 2.5
    + (input.revenueConcentrationPercent >= 65 ? 12 : 0)
    + (launches180 >= 8 ? 10 : 0)
  );
  const growthTrendScore = clampScore(
    Math.min(35, launchTrendRatio * 30)
    + Math.min(30, medianReviewVelocity / 6)
    + Math.min(20, medianPlayerMomentum / 20)
    + (launches90 > 0 ? 15 : 0)
  );
  const genreMomentumScore = clampScore(
    Math.min(40, launches365 * 5)
    + Math.min(30, average(reviewScores) * 0.3)
    + Math.min(30, averageReviewCount / 150)
  );
  const topTags = getTopTags(games);
  const tagPopularityScore = clampScore(
    topTags.length > 0
      ? average(topTags.map((tag) => (tag.directCount * 12) + (tag.count * 3)))
      : 0
  );
  const marketSaturationScore = clampScore(
    competitionScore * 0.55
    + input.revenueConcentrationPercent * 0.25
    + (launches180 >= 10 ? 20 : launches180 >= 5 ? 10 : 0)
  );
  const priceCompatibilityScore = input.project.pricePointCents && input.medianPriceCents > 0
    ? clampScore(100 - (Math.abs(input.project.pricePointCents - input.medianPriceCents) / input.medianPriceCents) * 100)
    : priceValues.length > 0 ? 65 : 45;
  const sentimentScore = clampScore(
    (input.averageReviewScore ?? average(reviewScores)) * 0.75
    + Math.min(25, medianReviewCount / 200)
  );
  const historicalPerformanceScore = clampScore(
    Math.min(45, revenueRange.medianCents / 4_000_000)
    + Math.min(35, p90RevenueCents / 12_000_000)
    + Math.min(20, averageReviewCount / 300)
  );
  const discoverabilityDifficultyScore = clampScore(
    competitionScore * 0.45
    + marketSaturationScore * 0.35
    + input.revenueConcentrationPercent * 0.2
  );
  const audienceSizeScore = clampScore(
    demandScore * 0.5
    + historicalPerformanceScore * 0.3
    + tagPopularityScore * 0.2
  );
  const commercialOpportunityScore = clampScore(
    demandScore * 0.24
    + growthTrendScore * 0.16
    + genreMomentumScore * 0.12
    + tagPopularityScore * 0.1
    + priceCompatibilityScore * 0.1
    + sentimentScore * 0.1
    + historicalPerformanceScore * 0.14
    + Math.max(0, 100 - marketSaturationScore) * 0.04
  );
  const riskScore = clampScore(
    discoverabilityDifficultyScore * 0.35
    + marketSaturationScore * 0.25
    + Math.max(0, 100 - sentimentScore) * 0.2
    + Math.max(0, 100 - input.confidenceScore) * 0.2
  );
  const opportunityScore = clampScore(
    commercialOpportunityScore * 0.55
    + Math.max(0, 100 - riskScore) * 0.25
    + growthTrendScore * 0.12
    + priceCompatibilityScore * 0.08
  );
  const classification = getOpportunityClassification(
    opportunityScore,
    demandScore,
    competitionScore,
    growthTrendScore,
    marketSaturationScore
  );
  const factors = [
    {
      name: "Demand",
      score: demandScore,
      weight: 24,
      justification: `Demand is estimated from median review count, review velocity, revenue median, and player momentum.`,
      metrics: {
        medianReviewCount,
        medianReviewVelocity90: medianReviewVelocity,
        medianRevenue: formatMoney(revenueRange.medianCents),
        medianPlayerMomentum
      }
    },
    {
      name: "Competition",
      score: clampScore(100 - competitionScore),
      weight: 14,
      justification: `Competition penalty reflects direct/adjacent comparable density and winner concentration.`,
      metrics: {
        directComparables: input.directComparables.length,
        adjacentComparables: input.adjacentComparables.length,
        revenueConcentrationPercent: input.revenueConcentrationPercent
      }
    },
    {
      name: "Growth trend",
      score: growthTrendScore,
      weight: 16,
      justification: `Growth is based on recent launch ratio, review velocity, player momentum, and 90-day launch activity.`,
      metrics: {
        launches90,
        launches365,
        launchTrendRatio: Number(launchTrendRatio.toFixed(2))
      }
    },
    {
      name: "Genre momentum",
      score: genreMomentumScore,
      weight: 12,
      justification: `Genre momentum uses launch activity, review quality, and average review volume in the comparable set.`,
      metrics: {
        launches365,
        averageReviewScore: Number(average(reviewScores).toFixed(1)),
        averageReviewCount: Math.round(averageReviewCount)
      }
    },
    {
      name: "Tag popularity",
      score: tagPopularityScore,
      weight: 10,
      justification: `Tag popularity measures repeated direct-comparable tags rather than freeform AI interpretation.`,
      metrics: {
        topTags: topTags.slice(0, 5).map((tag) => `${tag.name} (${tag.directCount}/${tag.count})`).join(", ") || "No strong tag cluster"
      }
    },
    {
      name: "Market saturation",
      score: clampScore(100 - marketSaturationScore),
      weight: 10,
      justification: `Saturation subtracts crowded shelves, recent release density, and winner concentration.`,
      metrics: {
        saturationScore: marketSaturationScore,
        launches180,
        winnerConcentrationPercent: input.revenueConcentrationPercent
      }
    },
    {
      name: "Pricing compatibility",
      score: priceCompatibilityScore,
      weight: 8,
      justification: input.project.pricePointCents
        ? `Project price is compared against the segment median price.`
        : `No project price was supplied, so pricing confidence is capped by segment coverage.`,
      metrics: {
        projectPrice: input.project.pricePointCents ? formatMoney(input.project.pricePointCents) : "Not set",
        segmentMedianPrice: formatMoney(input.medianPriceCents)
      }
    },
    {
      name: "User sentiment",
      score: sentimentScore,
      weight: 10,
      justification: `Sentiment combines review score with enough review volume to avoid overvaluing tiny samples.`,
      metrics: {
        averageReviewScore: input.averageReviewScore ?? Number(average(reviewScores).toFixed(1)),
        medianReviewCount
      }
    },
    {
      name: "Historical performance",
      score: historicalPerformanceScore,
      weight: 14,
      justification: `Historical performance uses estimated revenue distribution and review volume of comparable launches.`,
      metrics: {
        lowRevenue: formatMoney(revenueRange.lowCents),
        medianRevenue: formatMoney(revenueRange.medianCents),
        highRevenue: formatMoney(revenueRange.highCents),
        p90Revenue: formatMoney(p90RevenueCents)
      }
    }
  ];
  const sortedByRevenue = [...games].sort(
    (left, right) => revenueToNumber(right.revenueEstimates[0]?.medianNetRevenueCents) - revenueToNumber(left.revenueEstimates[0]?.medianNetRevenueCents)
  );
  const sortedByReviewVelocity = [...games].sort((left, right) => (right.reviewCount ?? 0) - (left.reviewCount ?? 0));
  const recentSuccessfulLaunches = games
    .filter((game) => game.releaseDate && now - game.releaseDate.getTime() <= 365 * 24 * 60 * 60 * 1000 && (game.reviewScore ?? 0) >= 80 && (game.reviewCount ?? 0) >= 100)
    .sort((left, right) => (right.reviewCount ?? 0) - (left.reviewCount ?? 0));
  const failedLaunches = games
    .filter((game) => game.releaseDate && now - game.releaseDate.getTime() <= 365 * 24 * 60 * 60 * 1000 && ((game.reviewScore ?? 100) < 65 || (game.reviewCount ?? 0) < 25))
    .sort((left, right) => (left.reviewScore ?? 0) - (right.reviewScore ?? 0));
  const mapGame = (game: RankedComparableGame) => ({
    name: game.name,
    appId: game.appId,
    similarityScore: game.similarityScore,
    reviewScore: game.reviewScore,
    reviewCount: game.reviewCount,
    priceCents: game.priceCurrent?.finalPriceCents ?? null,
    releaseDate: game.releaseDate?.toISOString() ?? null,
    medianRevenueCents: revenueToNumber(game.revenueEstimates[0]?.medianNetRevenueCents),
    tags: game.tags.slice(0, 5).map((tag) => tag.steamTag.name),
    genres: game.genres.slice(0, 4).map((genre) => genre.steamGenre.name)
  });
  const risingTags = topTags
    .filter((tag) => tag.directCount >= 2 || tag.count >= 4)
    .map((tag) => ({
      tag: tag.name,
      strengthScore: clampScore(tag.directCount * 18 + tag.count * 4),
      explanation: `${tag.name} appears in ${tag.directCount} direct comps and ${tag.count} total comps, which suggests repeatable audience language rather than a one-off label.`
    }));
  const decliningSignals = [
    growthTrendScore < 45
      ? {
          signal: "Weak recent launch/review momentum",
          score: growthTrendScore,
          explanation: `Only ${launches90} comparable launches landed in 90 days and median review velocity is ${medianReviewVelocity}, so current demand may be slower than the historical shelf implies.`
        }
      : null,
    medianPlayerMomentum <= 0 && input.playerSnapshots.length > 0
      ? {
          signal: "Flat player momentum",
          score: 35,
          explanation: "Player count snapshots do not show positive median momentum across covered comps."
        }
      : null
  ].filter((item): item is { signal: string; score: number; explanation: string } => Boolean(item));
  const underservedNiches = topTags
    .filter((tag) => tag.directCount >= 1 && input.directComparables.length <= 6 && demandScore >= 55)
    .slice(0, 4)
    .map((tag) => ({
      niche: tag.name,
      confidence: getScoreLabel(input.confidenceScore),
      explanation: `${tag.name} has visible demand signals, but the direct comparable count is ${input.directComparables.length}, so it may be less crowded than the broader genre.`
    }));
  const seasonalOpportunities = launches90 > launches180 / 2
    ? [
        {
          window: "Near-term release window",
          confidence: getScoreLabel(growthTrendScore),
          explanation: "A high share of launches happened in the last 90 days, so wishlist and festival timing should be checked before committing to a crowded window."
        }
      ]
    : [
        {
          window: "Flexible timing",
          confidence: getScoreLabel(input.confidenceScore),
          explanation: "Recent launch density is not extreme, so positioning and wishlist readiness matter more than avoiding one specific season."
        }
      ];

  return {
    sourceModel: "hybrid_quantitative_market_intelligence_v1",
    aiDependency: "optional_enhancement_only",
    sourcesUsed: [
      "Steam public metadata",
      "Steam review distributions",
      "Steam price data",
      "Steam release history",
      "Steam tag and genre ecosystems",
      "Steam player count snapshots when available",
      "Internal Steam revenue estimates derived from review multipliers",
      "SteamDB-style public popularity signals when player snapshots are present"
    ],
    dataQuality: {
      score: input.confidenceScore,
      label: input.confidenceLabel,
      coverage: {
        comparableGames: games.length,
        directComparables: input.directComparables.length,
        adjacentComparables: input.adjacentComparables.length,
        revenueCoverage: revenueValues.length,
        priceCoverage: priceValues.length,
        reviewCoverage: reviewScores.length,
        reviewSnapshotCoverage: new Set(input.reviewSnapshots.map((snapshot) => snapshot.steamGameId)).size,
        playerSnapshotCoverage: new Set(input.playerSnapshots.map((snapshot) => snapshot.steamGameId)).size
      },
      limitations: [
        revenueValues.length < Math.max(3, games.length * 0.35) ? "Revenue estimates have limited coverage." : null,
        input.playerSnapshots.length === 0 ? "Concurrent player trend data is unavailable for this comp set." : null,
        input.confidenceScore < 60 ? "Confidence is directional because one or more data layers are thin." : null
      ].filter((item): item is string => Boolean(item))
    },
    probabilisticAssessment: {
      classification,
      confidenceLevel: input.confidenceLabel,
      confidenceScore: input.confidenceScore,
      probabilities: {
        commercialOpportunity: opportunityScore,
        nicheDemand: demandScore,
        oversaturation: marketSaturationScore,
        executionRisk: riskScore,
        growthPotential: growthTrendScore,
        discoverabilityDifficulty: discoverabilityDifficultyScore
      },
      conclusion: `${classification}: opportunity score ${opportunityScore}/100 with ${input.confidenceLabel.toLowerCase()} confidence. Demand is ${getScoreLabel(demandScore).toLowerCase()}, competition pressure is ${getScoreLabel(competitionScore).toLowerCase()}, and growth momentum is ${getScoreLabel(growthTrendScore).toLowerCase()}.`
    },
    opportunityScoring: {
      score: opportunityScore,
      label: getScoreLabel(opportunityScore),
      commercialOpportunityScore,
      riskScore,
      factors
    },
    demandModel: {
      demandScore,
      audienceSizeScore,
      marketMomentumScore: growthTrendScore,
      revenuePotentialRange: revenueRange,
      wishlistProxy: {
        score: clampScore(reviewVelocityValues.length > 0 ? medianReviewVelocity * 4 + launches90 * 5 : demandScore * 0.45),
        basis: "Wishlist proxy uses review velocity, recent launch activity, review volume, and tag concentration because Steam does not expose wishlist counts publicly."
      },
      reasoning: `Demand is inferred from ${medianReviewCount} median reviews, ${medianReviewVelocity} median review growth in the observed window, ${formatMoney(revenueRange.medianCents)} median estimated revenue, and ${launches365} comparable launches in 12 months.`
    },
    competitiveIntelligence: {
      directCompetitors: input.directComparables.slice(0, 8).map(mapGame),
      adjacentCompetitors: input.adjacentComparables.slice(0, 8).map(mapGame),
      marketLeaders: sortedByRevenue.slice(0, 6).map(mapGame),
      fastGrowingGames: sortedByReviewVelocity.slice(0, 6).map(mapGame),
      recentlySuccessfulLaunches: recentSuccessfulLaunches.slice(0, 6).map(mapGame),
      failedLaunches: failedLaunches.slice(0, 6).map(mapGame)
    },
    trendDetection: {
      risingGenres: launches365 > launchesOlder
        ? [
            {
              trend: input.project.genreInput || "Current comparable genre cluster",
              strengthScore: genreMomentumScore,
              explanation: `${launches365} comparable launches appeared in the last year versus ${launchesOlder} older tracked comps, indicating rising supply and likely audience attention.`
            }
          ]
        : [],
      emergingTags: risingTags,
      decliningSignals,
      seasonalOpportunities,
      underservedNiches,
      marketShiftExplanation: growthTrendScore >= 65
        ? "Momentum is likely being driven by recent releases converting into review volume and repeated tag clusters, which indicates a shelf with active audience search behavior."
        : "The market is not clearly accelerating; any opportunity depends more on differentiated positioning than broad category growth."
    },
    evidenceTrail: [
      {
        claim: "Market demand estimate",
        support: summarizeEvidence({
          demandScore,
          medianReviewCount,
          medianReviewVelocity,
          medianRevenue: formatMoney(revenueRange.medianCents)
        }),
        sources: ["Steam reviews", "Steam review snapshots", "Internal revenue estimates"]
      },
      {
        claim: "Competition density estimate",
        support: summarizeEvidence({
          directComparables: input.directComparables.length,
          adjacentComparables: input.adjacentComparables.length,
          launches180,
          saturationScore: marketSaturationScore
        }),
        sources: ["Steam metadata", "Steam release dates", "Steam tag/genre matching"]
      },
      {
        claim: "Revenue potential range",
        support: summarizeEvidence({
          low: formatMoney(revenueRange.lowCents),
          median: formatMoney(revenueRange.medianCents),
          high: formatMoney(revenueRange.highCents),
          p90: formatMoney(p90RevenueCents)
        }),
        sources: ["Internal revenue estimates", "Steam review counts", "Steam pricing"]
      },
      {
        claim: "Trend and momentum read",
        support: summarizeEvidence({
          launches90,
          launches365,
          medianPlayerMomentum,
          growthTrendScore
        }),
        sources: ["Steam release history", "Steam player count snapshots", "Steam review snapshots"]
      }
    ]
  };
}

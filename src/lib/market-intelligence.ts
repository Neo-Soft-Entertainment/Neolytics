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

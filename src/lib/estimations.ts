import { EstimateConfidence } from "@prisma/client";

import type { NormalizedSteamApp } from "@/lib/steam/types";

const genreMultipliers: Record<string, number> = {
  strategy: 1.15,
  simulation: 1.1,
  rpg: 1.08,
  indie: 1,
  action: 0.98,
  casual: 0.92
};

function resolveGenreAdjustment(game: NormalizedSteamApp) {
  const primaryGenre = game.genres[0]?.slug;

  if (!primaryGenre) {
    return 1;
  }

  return genreMultipliers[primaryGenre] ?? 1;
}

function resolvePriceTierAdjustment(priceCents: number | null) {
  if (!priceCents || priceCents === 0) {
    return 0.7;
  }

  if (priceCents < 1000) {
    return 0.85;
  }

  if (priceCents <= 2500) {
    return 1;
  }

  if (priceCents <= 4000) {
    return 1.08;
  }

  return 1.15;
}

function resolveAgeAdjustment(releaseDate: Date | null) {
  if (!releaseDate) {
    return 0.95;
  }

  const ageDays = Math.floor((Date.now() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));

  if (ageDays <= 180) {
    return 0.9;
  }

  if (ageDays <= 730) {
    return 1;
  }

  return 1.12;
}

function resolveConfidenceScore(game: NormalizedSteamApp) {
  let score = 40;

  if (game.reviews.totalReviews > 0) {
    score += 20;
  }

  if (game.currentPrice.finalPriceCents !== null || game.isFree) {
    score += 15;
  }

  if (game.releaseDate) {
    score += 10;
  }

  if (game.genres.length > 0) {
    score += 10;
  }

  if (game.tags.length > 0) {
    score += 5;
  }

  return Math.min(score, 95);
}

function resolveConfidenceLabel(score: number) {
  if (score >= 80) {
    return EstimateConfidence.HIGH;
  }

  if (score >= 60) {
    return EstimateConfidence.MEDIUM;
  }

  return EstimateConfidence.LOW;
}

export function calculateSalesEstimate(game: NormalizedSteamApp, baseReviewMultiplier: number) {
  const genreAdjustment = resolveGenreAdjustment(game);
  const priceTierAdjustment = resolvePriceTierAdjustment(game.currentPrice.finalPriceCents);
  const ageAdjustment = resolveAgeAdjustment(game.releaseDate);
  const medianEstimate = Math.round(
    game.reviews.totalReviews *
      baseReviewMultiplier *
      genreAdjustment *
      priceTierAdjustment *
      ageAdjustment
  );
  const confidenceScore = resolveConfidenceScore(game);
  const rangeFactor = confidenceScore >= 80 ? 0.18 : confidenceScore >= 60 ? 0.28 : 0.4;
  const lowEstimate = Math.max(0, Math.round(medianEstimate * (1 - rangeFactor)));
  const highEstimate = Math.round(medianEstimate * (1 + rangeFactor));

  return {
    reviewMultiplier: baseReviewMultiplier,
    genreAdjustment,
    priceTierAdjustment,
    ageAdjustment,
    lowEstimate,
    medianEstimate,
    highEstimate,
    confidenceScore,
    confidence: resolveConfidenceLabel(confidenceScore),
    explanation: `Sales estimate uses ${game.reviews.totalReviews} reviews x base multiplier ${baseReviewMultiplier.toFixed(1)}, adjusted by genre (${genreAdjustment.toFixed(2)}), price tier (${priceTierAdjustment.toFixed(2)}), and age (${ageAdjustment.toFixed(2)}).`
  };
}

export function calculateRevenueEstimate(game: NormalizedSteamApp, salesEstimate: ReturnType<typeof calculateSalesEstimate>) {
  const averagePriceCents = game.currentPrice.finalPriceCents ?? 0;
  const lowGrossRevenueCents = BigInt(salesEstimate.lowEstimate) * BigInt(averagePriceCents);
  const medianGrossRevenueCents = BigInt(salesEstimate.medianEstimate) * BigInt(averagePriceCents);
  const highGrossRevenueCents = BigInt(salesEstimate.highEstimate) * BigInt(averagePriceCents);

  function toNetRevenue(grossRevenueCents: bigint) {
    return (grossRevenueCents * 70n + 50n) / 100n;
  }

  return {
    averagePriceCents,
    lowGrossRevenueCents,
    medianGrossRevenueCents,
    highGrossRevenueCents,
    lowNetRevenueCents: toNetRevenue(lowGrossRevenueCents),
    medianNetRevenueCents: toNetRevenue(medianGrossRevenueCents),
    highNetRevenueCents: toNetRevenue(highGrossRevenueCents),
    confidenceScore: salesEstimate.confidenceScore,
    confidence: salesEstimate.confidence,
    explanation: `Revenue estimate uses the estimated sales range and the current average selling price of ${(averagePriceCents / 100).toFixed(2)} USD, then applies a 70% net revenue factor.`
  };
}

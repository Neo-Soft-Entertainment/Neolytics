import { ReviewSentiment } from "@prisma/client";

import { slugify } from "@/lib/slugify";
import type {
  NormalizedSteamApp,
  SteamAppDetailsResponse,
  SteamPlayerCountResponse,
  SteamReviewSummaryResponse
} from "@/lib/steam/types";

function sanitizeSteamText(value?: string | null) {
  if (!value) {
    return null;
  }

  const decoded = value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("â„¢", "™")
    .replaceAll("â€™", "’")
    .replaceAll("â€œ", "“")
    .replaceAll("â€", "”")
    .replaceAll("â€“", "–")
    .replaceAll("â€”", "—")
    .replaceAll("â€¦", "…")
    .replaceAll("Â®", "®")
    .replaceAll("Â", "")
    .replace(/\s+/g, " ")
    .trim();

  if (!/[ÃÂâ]/.test(decoded)) {
    return decoded;
  }

  const repaired = Buffer.from(decoded, "latin1").toString("utf8").trim();

  if (/[ÃÂâ]/.test(repaired)) {
    return decoded;
  }

  return repaired;
}

function parseReleaseDate(dateText?: string) {
  if (!dateText) {
    return null;
  }

  const parsed = new Date(dateText);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function normalizeReviewSentiment(value?: string): ReviewSentiment {
  const normalized = (value ?? "").trim().toUpperCase().replace(/\s+/g, "_");

  const candidates = Object.values(ReviewSentiment);

  if (candidates.includes(normalized as ReviewSentiment)) {
    return normalized as ReviewSentiment;
  }

  return ReviewSentiment.UNKNOWN;
}

export async function extractStoreTags(appId: number, storeBaseUrl: string) {
  const response = await fetch(`${storeBaseUrl}/app/${appId}`, {
    headers: {
      "User-Agent": "NeolyticsBot/1.0"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  const matches = [...html.matchAll(/app_tag[^>]*>([^<]+)</g)];
  const names = Array.from(
    new Set(
      matches
        .map((match) => sanitizeSteamText(match[1]))
        .filter((value): value is string => Boolean(value && value.length > 1))
    )
  );

  return names.slice(0, 12).map((name) => ({
    name,
    slug: slugify(name)
  }));
}

export function normalizeSteamApp(params: {
  appId: number;
  details: SteamAppDetailsResponse;
  reviewSummary: SteamReviewSummaryResponse;
  playerCount: SteamPlayerCountResponse;
  tags: Array<{ name: string; slug: string }>;
}): NormalizedSteamApp | null {
  const entry = params.details[String(params.appId)];

  if (!entry?.success || !entry.data?.name) {
    return null;
  }

  const detail = entry.data;

  if (detail.type && detail.type !== "game") {
    return null;
  }

  if (!detail.name) {
    return null;
  }

  const genres = (detail.genres ?? []).map((genre) => ({
    steamGenreId: genre.id ? Number(genre.id) : null,
    name: sanitizeSteamText(genre.description) ?? genre.description,
    slug: slugify(sanitizeSteamText(genre.description) ?? genre.description)
  }));

  const developers = (detail.developers ?? []).map((value) => {
    const name = sanitizeSteamText(value) ?? value;

    return {
      name,
      slug: slugify(name)
    };
  });

  const publishers = (detail.publishers ?? []).map((value) => {
    const name = sanitizeSteamText(value) ?? value;

    return {
      name,
      slug: slugify(name)
    };
  });

  const name = sanitizeSteamText(detail.name) ?? detail.name;
  const shortDescription = sanitizeSteamText(detail.short_description);
  const totalReviews = params.reviewSummary.query_summary?.total_reviews ?? 0;
  const totalPositiveReviews = params.reviewSummary.query_summary?.total_positive ?? 0;
  const totalNegativeReviews = params.reviewSummary.query_summary?.total_negative ?? 0;
  const reviewScore = totalReviews > 0
    ? Number(((totalPositiveReviews / totalReviews) * 100).toFixed(1))
    : null;

  return {
    appId: detail.steam_appid,
    type: detail.type ?? null,
    name,
    slug: slugify(name),
    shortDescription,
    isFree: Boolean(detail.is_free),
    isEarlyAccess: Boolean(detail.release_date?.coming_soon),
    headerImageUrl: detail.header_image ?? null,
    capsuleImageUrl: detail.capsule_image ?? null,
    websiteUrl: detail.website ?? null,
    supportUrl: detail.support_info?.url ?? null,
    releaseDate: parseReleaseDate(detail.release_date?.date),
    releaseDateText: detail.release_date?.date ?? null,
    metacriticScore: detail.metacritic?.score ?? null,
    currentPrice: {
      currency: detail.price_overview?.currency ?? "USD",
      initialPriceCents: detail.price_overview?.initial ?? null,
      finalPriceCents: detail.price_overview?.final ?? null,
      discountPercent: detail.price_overview?.discount_percent ?? null,
      isFree: Boolean(detail.is_free)
    },
    reviews: {
      totalReviews,
      totalPositiveReviews,
      totalNegativeReviews,
      reviewScore,
      reviewScoreLabel: normalizeReviewSentiment(params.reviewSummary.query_summary?.review_score_desc)
    },
    currentPlayers: params.playerCount.response?.player_count ?? 0,
    genres,
    tags: params.tags,
    developers,
    publishers,
    rawPayload: detail
  };
}

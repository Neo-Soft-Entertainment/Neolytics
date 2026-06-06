import { ReviewSentiment } from "@prisma/client";

export interface SteamAppListResponse {
  applist: {
    apps: Array<{
      appid: number;
      name: string;
    }>;
  };
}

export interface SteamAppDetailsResponse {
  [appId: string]: {
    success: boolean;
    data?: {
      steam_appid: number;
      type?: string;
      name?: string;
      short_description?: string;
      is_free?: boolean;
      header_image?: string;
      capsule_image?: string;
      website?: string;
      support_info?: {
        url?: string;
      };
      release_date?: {
        coming_soon?: boolean;
        date?: string;
      };
      platforms?: Record<string, boolean>;
      price_overview?: {
        currency?: string;
        initial?: number;
        final?: number;
        discount_percent?: number;
      };
      metacritic?: {
        score?: number;
      };
      developers?: string[];
      publishers?: string[];
      genres?: Array<{ id: string; description: string }>;
      categories?: Array<{ id: number; description: string }>;
      supported_languages?: string;
    };
  };
}

export interface SteamReviewSummaryResponse {
  success: number;
  query_summary?: {
    total_reviews?: number;
    total_positive?: number;
    total_negative?: number;
    review_score?: number;
    review_score_desc?: string;
  };
}

export interface SteamPlayerCountResponse {
  response?: {
    player_count?: number;
    result?: number;
  };
}

export interface NormalizedSteamApp {
  appId: number;
  type: string | null;
  name: string;
  slug: string;
  shortDescription: string | null;
  isFree: boolean;
  isEarlyAccess: boolean;
  headerImageUrl: string | null;
  capsuleImageUrl: string | null;
  websiteUrl: string | null;
  supportUrl: string | null;
  releaseDate: Date | null;
  releaseDateText: string | null;
  metacriticScore: number | null;
  currentPrice: {
    currency: string | null;
    initialPriceCents: number | null;
    finalPriceCents: number | null;
    discountPercent: number | null;
    isFree: boolean;
  };
  reviews: {
    totalReviews: number;
    totalPositiveReviews: number;
    totalNegativeReviews: number;
    reviewScore: number | null;
    reviewScoreLabel: ReviewSentiment;
  };
  currentPlayers: number;
  genres: Array<{
    steamGenreId: number | null;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    name: string;
    slug: string;
  }>;
  developers: Array<{
    name: string;
    slug: string;
  }>;
  publishers: Array<{
    name: string;
    slug: string;
  }>;
  rawPayload: unknown;
}

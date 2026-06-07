import { env } from "@/env";
import { logger } from "@/lib/logger";

export interface AiProjectMarketAnalysisLayer {
  marketSummary: string;
  opportunitySummary: string;
  riskSummary: string;
  audienceAutofill: string;
  coreLoopAutofill: string;
  strategicNarrative: string;
  positioningSummary: string;
  launchStrategy: string;
  pricingNarrative: string;
  storeCapsuleAdvice: string;
  confidenceNarrative: string;
  creativeAngles: string[];
  acquisitionChannels: string[];
  wishlistDrivers: string[];
  redFlags: string[];
}

export interface AiSegmentReportLayer {
  executiveSummary: string;
  demandDrivers: string;
  saturationRead: string;
  pricingRead: string;
  launchWindowAdvice: string;
  monetizationRead: string;
  confidenceNarrative: string;
  actionItems: string[];
}

type OpenAiResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

async function requestStructuredOutput<T>(schemaName: string, schema: Record<string, unknown>, prompt: string) {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: env.OPENAI_MARKET_ANALYSIS_MODEL || "gpt-5-mini",
        input: [
          {
            role: "developer",
            content: [
              {
                type: "input_text",
                text: "You are a senior game marketing analyst. Use only the supplied facts. Never invent numeric data, games, channels, audiences, or claims that are not supported by the dataset. If data coverage is weak, say so directly and reduce confidence."
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: prompt
              }
            ]
          }
        ],
        max_output_tokens: 1600,
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            schema,
            strict: true
          }
        }
      })
    });

    if (!response.ok) {
      logger.warn({
        status: response.status,
        body: await response.text()
      }, "OpenAI market analysis request failed");
      return null;
    }

    const payload = await response.json() as OpenAiResponsePayload;
    const text = payload.output_text?.trim()
      || payload.output
        ?.flatMap((item) => item.content ?? [])
        .find((item) => item.type === "output_text" && typeof item.text === "string")
        ?.text
        ?.trim();

    if (!text) {
      logger.warn("OpenAI market analysis returned no output text");
      return null;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    logger.error({ error }, "OpenAI market analysis request crashed");
    return null;
  }
}

export async function generateAiProjectMarketAnalysis(input: {
  project: {
    name: string;
    elevatorPitch: string | null;
    description: string | null;
    genreInput: string | null;
    tagInput: string | null;
    targetAudience: string | null;
    coreLoop: string | null;
    differentiator: string | null;
    monetizationModel: string | null;
    playerFantasy: string | null;
    pricePointCents: number | null;
  };
  market: {
    matchingGamesCount: number;
    directComparableCount: number;
    adjacentComparableCount: number;
    marketSizeLabel: string;
    marketSizeCents: number;
    medianRevenueCents: number;
    averageReviewScore: number | null;
    medianPriceCents: number | null;
    crowdednessScore: number;
    revenueConcentrationPercent: number;
    confidenceScore: number;
    confidenceLabel: string;
    opportunityScore: number;
    riskScore: number;
    executionBarScore: number;
    reviewVelocity90: number;
    previousReviewVelocity90: number;
    playerMomentum30: number;
    previousPlayerMomentum30: number;
    launches90: number;
    launches180: number;
    launches365: number;
    dominantMonetization: string;
    premiumSharePercent: number;
    practicalRecommendations: string[];
    keyMismatches: string[];
    directComparables: Array<{
      name: string;
      reviewScore: number | null;
      reviewCount: number | null;
      priceCents: number | null;
      medianRevenueCents: number;
      genres: string[];
      tags: string[];
    }>;
    adjacentComparables: Array<{
      name: string;
      reviewScore: number | null;
      reviewCount: number | null;
      priceCents: number | null;
      medianRevenueCents: number;
      genres: string[];
      tags: string[];
    }>;
  };
}) {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      marketSummary: { type: "string" },
      opportunitySummary: { type: "string" },
      riskSummary: { type: "string" },
      audienceAutofill: { type: "string" },
      coreLoopAutofill: { type: "string" },
      strategicNarrative: { type: "string" },
      positioningSummary: { type: "string" },
      launchStrategy: { type: "string" },
      pricingNarrative: { type: "string" },
      storeCapsuleAdvice: { type: "string" },
      confidenceNarrative: { type: "string" },
      creativeAngles: {
        type: "array",
        items: { type: "string" }
      },
      acquisitionChannels: {
        type: "array",
        items: { type: "string" }
      },
      wishlistDrivers: {
        type: "array",
        items: { type: "string" }
      },
      redFlags: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: [
      "marketSummary",
      "opportunitySummary",
      "riskSummary",
      "audienceAutofill",
      "coreLoopAutofill",
      "strategicNarrative",
      "positioningSummary",
      "launchStrategy",
      "pricingNarrative",
      "storeCapsuleAdvice",
      "confidenceNarrative",
      "creativeAngles",
      "acquisitionChannels",
      "wishlistDrivers",
      "redFlags"
    ]
  };

  return requestStructuredOutput<AiProjectMarketAnalysisLayer>(
    "project_market_analysis",
    schema,
    [
      "Produce an investor-grade but practical game marketing analysis for a Steam game concept.",
      "Use the provided metrics as the source of truth and keep every field concise, commercial, and actionable.",
      "Do not repeat the raw numbers mechanically. Explain what the numbers imply.",
      "When confidence is low, say exactly why.",
      "",
      "PROJECT",
      JSON.stringify(input.project, null, 2),
      "",
      "MARKET FACTS",
      JSON.stringify(input.market, null, 2),
      "",
      "OUTPUT RULES",
      "- marketSummary: 3-4 sentences on real market shape.",
      "- opportunitySummary: 2-3 sentences on upside and where it comes from.",
      "- riskSummary: 2-3 sentences on commercial risk.",
      "- audienceAutofill: one strong audience paragraph.",
      "- coreLoopAutofill: one strong loop paragraph tied to market demand.",
      "- strategicNarrative: positioning thesis for founders/publishers.",
      "- positioningSummary: one paragraph on the wedge this project should own.",
      "- launchStrategy: one paragraph on launch timing and go-to-market.",
      "- pricingNarrative: one paragraph on pricing and offer design.",
      "- storeCapsuleAdvice: one paragraph on capsule/store messaging.",
      "- confidenceNarrative: one paragraph on why the analysis is high/medium/low confidence.",
      "- creativeAngles: 3 to 5 ad/store messaging angles.",
      "- acquisitionChannels: 3 to 5 realistic channels for this type of Steam game.",
      "- wishlistDrivers: 3 to 5 factors most likely to drive wishlists.",
      "- redFlags: 3 to 5 sharp warnings grounded in the supplied dataset."
    ].join("\n")
  );
}

export async function generateAiSegmentReportLayer(input: {
  title: string;
  genre?: string;
  tag?: string;
  segment: Record<string, unknown>;
  leaders: Array<{
    name: string;
    priceCents: number | null;
    reviewScore: number | null;
    reviewCount: number | null;
    medianRevenueCents: number;
    genres: string[];
    tags: string[];
  }>;
}) {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      executiveSummary: { type: "string" },
      demandDrivers: { type: "string" },
      saturationRead: { type: "string" },
      pricingRead: { type: "string" },
      launchWindowAdvice: { type: "string" },
      monetizationRead: { type: "string" },
      confidenceNarrative: { type: "string" },
      actionItems: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: [
      "executiveSummary",
      "demandDrivers",
      "saturationRead",
      "pricingRead",
      "launchWindowAdvice",
      "monetizationRead",
      "confidenceNarrative",
      "actionItems"
    ]
  };

  return requestStructuredOutput<AiSegmentReportLayer>(
    "segment_market_report",
    schema,
    [
      "Write a serious Steam segment market brief for studio leadership.",
      "Use only the provided segment data and leading titles.",
      "Be crisp, commercial, and grounded in the evidence.",
      "",
      "REPORT",
      JSON.stringify({
        title: input.title,
        genre: input.genre ?? null,
        tag: input.tag ?? null,
        segment: input.segment,
        leaders: input.leaders
      }, null, 2),
      "",
      "OUTPUT RULES",
      "- executiveSummary: 3-4 sentences.",
      "- demandDrivers: explain where demand is coming from.",
      "- saturationRead: explain how crowded or open the space is.",
      "- pricingRead: explain pricing pattern and implications.",
      "- launchWindowAdvice: timing and launch density advice.",
      "- monetizationRead: explain what monetization mix implies.",
      "- confidenceNarrative: explain confidence level based on coverage.",
      "- actionItems: 4 to 6 concrete next moves."
    ].join("\n")
  );
}

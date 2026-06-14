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

export interface AiProjectArtAnalysisLayer {
  visualCritique: string;
  firstReadAssessment: string;
  capsuleAdvice: string;
  productionAdvice: string;
  marketPositioningAdvice: string;
  confidenceNarrative: string;
  priorityFixes: string[];
  strengths: string[];
  risks: string[];
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

function formatMoney(valueCents: number | null | undefined) {
  if (!valueCents || valueCents <= 0) {
    return "no reliable revenue coverage yet";
  }

  return (valueCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
}

function formatPrice(valueCents: number | null | undefined) {
  if (!valueCents || valueCents <= 0) {
    return "an unproven price point";
  }

  return (valueCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

async function requestStructuredOutput<T>(schemaName: string, schema: Record<string, unknown>, prompt: string) {
  if (!env.ENABLE_AI_MARKET_ANALYSIS) {
    return null;
  }

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
        model: env.OPENAI_MARKET_ANALYSIS_MODEL || "gpt-5.4-mini",
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
        ?.flatMap((item: any) => item.content ?? [])
        .find((item: any) => item.type === "output_text" && typeof item.text === "string")
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
    let resolvedValue0: any;
  if (input.market.averageReviewScore) {
    resolvedValue0 = `${input.market.averageReviewScore.toFixed(1)}%`;
  } else {
    resolvedValue0 = "limited coverage";
  }
  let resolvedValue1: any;
  if (input.market.launches180 > 0) {
    resolvedValue1 = `${input.market.launches180} comparable launches hit in the last 180 days, so the market is active enough that timing and positioning matter.`;
  } else {
    resolvedValue1 = "Recent launch density is still light, so the segment should be treated as less proven and more coverage-sensitive.";
  }
  let resolvedValue2: any;
  if (input.market.opportunityScore >= 70) {
    resolvedValue2 = "The upside is real if the project can carve out a clear wedge rather than blending into the median comp set.";
  } else {
    resolvedValue2 = "The upside is present, but it is not automatic; the concept still needs a sharper wedge to avoid looking interchangeable.";
  }
  let resolvedValue3: any;
  if (input.market.keyMismatches.length > 0) {
    resolvedValue3 = `The main commercial gap right now is ${input.market.keyMismatches[0].charAt(0).toLowerCase()}${input.market.keyMismatches[0].slice(1)}`;
  } else {
    resolvedValue3 = "The main opportunity comes from turning a reasonably active segment into a more ownable positioning thesis.";
  }
  let resolvedValue4: any;
  if (input.market.riskScore >= 65) {
    resolvedValue4 = "Commercial risk is elevated because the current data points to a demanding execution bar.";
  } else {
    resolvedValue4 = "Commercial risk is manageable, but it still depends on disciplined execution rather than raw concept novelty.";
  }
  let resolvedValue5: any;
  if (input.market.revenueConcentrationPercent >= 65) {
    resolvedValue5 = "Revenue is concentrated in a few leaders, so beating the shelf and first-impression bar is more important than simply matching features.";
  } else {
    resolvedValue5 = "Revenue is less concentrated than in a winner-take-most niche, which gives a better path for a focused entrant.";
  }
  let resolvedValue6: any;
  if (input.market.confidenceScore < 60) {
    resolvedValue6 = "Confidence is still limited because the coverage base is thin, so this should be treated as directional evidence.";
  } else {
    resolvedValue6 = "Confidence is strong enough to use this as a planning layer, not just an exploratory note.";
  }
  let resolvedValue7: any;
  if (input.project.differentiator?.trim()) {
    resolvedValue7 = `The wedge should revolve around ${input.project.differentiator.trim()}, but the product and store page need to make that differentiator visible immediately.`;
  } else {
    resolvedValue7 = `The project still needs a sharper wedge than the average comparable. Position it around the strongest fantasy-and-loop combination visible in the current comp set instead of broad genre language alone.`;
  }
  let resolvedValue8: any;
  if (input.market.launches90 >= 8) {
    resolvedValue8 = "Do not launch into the noisiest part of the release window without a much stronger store capsule, demo hook, or wishlist plan. The current segment is active enough that timing is a strategic variable.";
  } else {
    resolvedValue8 = "This segment gives more room to choose timing deliberately. Use that by building wishlists first and launching only once the store read is sharp enough to outperform a median comparable.";
  }
  let resolvedValue9: any;
  if (input.market.medianPriceCents) {
    resolvedValue9 = `Treat ${formatPrice(input.market.medianPriceCents)} as the center of gravity for this segment. If you price above that, the finish bar and value communication need to rise with it. If you price below it, the positioning still has to feel intentional rather than cheap.`;
  } else {
    resolvedValue9 = `Pricing still needs to be treated cautiously because the current segment price coverage is weak. Keep the offer architecture flexible until more comps are confirmed.`;
  }
  let resolvedValue10: any;
  if (input.market.confidenceScore >= 80) {
    resolvedValue10 = "Confidence is high because pricing, reviews, launch density, and comp coverage are all strong enough to support concrete planning.";
  } else {
        let resolvedValue16: any;
    if (input.market.confidenceScore >= 60) {
      resolvedValue16 = "Confidence is medium: the dataset is good enough to plan against, but some conclusions should still be treated as directional.";
    } else {
      resolvedValue16 = "Confidence is low because coverage is incomplete, so this should guide the next research step more than final greenlight decisions.";
    }
resolvedValue10 = resolvedValue16;
  }
  let resolvedValue11: any;
  if (input.project.genreInput?.toLowerCase().includes("horror")) {
    resolvedValue11 = "creator coverage and reaction-driven YouTube/TikTok clips";
  } else {
    resolvedValue11 = "genre-native creators and focused Steam Next Fest positioning";
  }
  let resolvedValue12: any;
  if (input.project.tagInput?.toLowerCase().includes("cozy")) {
    resolvedValue12 = "cozy and comfort-game creator niches on TikTok and YouTube";
  } else {
    resolvedValue12 = "wishlist capture through demos, festivals, and genre communities";
  }
  let resolvedValue13: any;
  if (input.market.keyMismatches.length > 0) {
    resolvedValue13 = input.market.keyMismatches.slice(0, 3);
  } else {
    resolvedValue13 = [];
  }
  let resolvedValue14: any;
  if (input.market.executionBarScore >= 70) {
    resolvedValue14 = "The execution bar is high enough that average production quality will not clear the commercial threshold.";
  } else {
    resolvedValue14 = "The current concept still needs a sharper, easier-to-communicate wedge.";
  }
  let resolvedValue15: any;
  if (input.market.confidenceScore < 60) {
    resolvedValue15 = "Coverage is still weak enough that the team should avoid overcommitting budget before another research pass.";
  } else {
    resolvedValue15 = "Do not mistake market viability for guaranteed positioning clarity; the store message still has to win.";
  }
const fallback: AiProjectMarketAnalysisLayer = {
    marketSummary: [
      `${input.project.name} is competing in a ${input.market.marketSizeLabel.toLowerCase()} Steam pocket with ${input.market.directComparableCount} direct comps and ${input.market.adjacentComparableCount} adjacent comps in the current dataset.`,
      `The current median revenue signal sits around ${formatMoney(input.market.medianRevenueCents)}, with review quality averaging ${resolvedValue0}.`,
      resolvedValue1
    ].join(" "),
    opportunitySummary: [
      resolvedValue2,
      resolvedValue3,
      input.market.practicalRecommendations[0] ?? "Commercial opportunity improves if the store fantasy becomes more legible."
    ].join(" "),
    riskSummary: [
      resolvedValue4,
      resolvedValue5,
      resolvedValue6
    ].join(" "),
    audienceAutofill: input.project.targetAudience?.trim()
      || `Target Steam players who already buy ${input.project.genreInput || "this category"} and respond to ${input.project.playerFantasy || "a clearly signaled fantasy"} with visible progression and an understandable value proposition at ${formatPrice(input.project.pricePointCents)}.`,
    coreLoopAutofill: input.project.coreLoop?.trim()
      || `Build the core loop around ${input.project.tagInput || "the strongest demand signals in the comp set"}, giving the player a fast path into ${input.project.playerFantasy || "the core fantasy"} and a clear reason to stay through repeatable mastery or progression beats.`,
    strategicNarrative: `${input.project.name} should be positioned as a ${input.project.genreInput || "Steam-native"} concept that wins on clarity first: clear fantasy, clear loop, clear price logic, and a store-facing wedge that can survive comparison against the top direct comps.`,
    positioningSummary: resolvedValue7,
    launchStrategy: resolvedValue8,
    pricingNarrative: resolvedValue9,
    storeCapsuleAdvice: `The capsule should sell ${input.project.playerFantasy || "the core player fantasy"} before it sells complexity. In this segment, first-read clarity matters more than feature density, especially when direct comps already own the obvious genre framing.`,
    confidenceNarrative: resolvedValue10,
    creativeAngles: [
      `Sell ${input.project.playerFantasy || "the clearest fantasy"} in one line, not the full feature list.`,
      `Frame the game against the strongest comp expectation in ${input.project.genreInput || "the segment"} and show the difference immediately.`,
      `Turn ${input.project.differentiator || "the sharpest project-specific hook"} into a repeatable store and trailer message.`
    ],
    acquisitionChannels: [
      "Steam capsule, short description, and wishlist-driven store optimization",
      resolvedValue11,
      resolvedValue12
    ],
    wishlistDrivers: [
      "A capsule that communicates the fantasy without needing context",
      "A short description that explains the loop and differentiation fast",
      "A demo or gameplay beat that proves the concept is not just aesthetic",
      "Store assets that make the value proposition legible at a glance"
    ],
    redFlags: [
      ...(resolvedValue13),
      resolvedValue14,
      resolvedValue15
    ].slice(0, 5)
  };
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

  const result = await requestStructuredOutput<AiProjectMarketAnalysisLayer>(
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

  return result ?? fallback;
}

export async function generateAiProjectArtAnalysis(input: {
  project: {
    name: string;
    elevatorPitch: string | null;
    description: string | null;
    genreInput: string | null;
    tagInput: string | null;
    targetAudience: string | null;
    coreLoop: string | null;
    differentiator: string | null;
    artDirection: string | null;
    playerFantasy: string | null;
    pricePointCents: number | null;
  };
  metrics: {
    assetCount: number;
    measuredAssets: number;
    highResolutionAssets: number;
    capsuleRatioAssets: number;
    squareAssets: number;
    pixelAnalyzedAssets: number;
    averageReadabilityScore: number;
    averageContrast: number;
    averageSaturation: number;
    averageEdgeDensity: number;
    highLegibilityRiskAssets: number;
    dominantColors: string[];
    distinctivenessScore: number;
    productionComplexityScore: number;
    marketFitScore: number;
    visualTrendScore: number;
    referenceGameNames: string[];
    paletteKeywords: string[];
    moodKeywords: string[];
  };
  assets: Array<{
    kind: string;
    originalName: string;
    width: number | null;
    height: number | null;
    notes: string | null;
    signedUrl: string | null;
    visualMetrics: unknown;
  }>;
}) {
  if (!env.ENABLE_AI_MARKET_ANALYSIS || !env.OPENAI_API_KEY || input.assets.length === 0) {
    return null;
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      visualCritique: { type: "string" },
      firstReadAssessment: { type: "string" },
      capsuleAdvice: { type: "string" },
      productionAdvice: { type: "string" },
      marketPositioningAdvice: { type: "string" },
      confidenceNarrative: { type: "string" },
      priorityFixes: {
        type: "array",
        items: { type: "string" }
      },
      strengths: {
        type: "array",
        items: { type: "string" }
      },
      risks: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: [
      "visualCritique",
      "firstReadAssessment",
      "capsuleAdvice",
      "productionAdvice",
      "marketPositioningAdvice",
      "confidenceNarrative",
      "priorityFixes",
      "strengths",
      "risks"
    ]
  };

  try {
    const imageInputs = input.assets
      .filter((asset: any) => Boolean(asset.signedUrl))
      .slice(0, 4)
      .map((asset: any) => ({
        type: "input_image",
        image_url: asset.signedUrl,
        detail: "low"
      }));

    if (imageInputs.length === 0) {
      return null;
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: env.OPENAI_MARKET_ANALYSIS_MODEL || "gpt-5.4-mini",
        input: [
          {
            role: "developer",
            content: [
              {
                type: "input_text",
                text: "You are a senior game art director and Steam capsule conversion analyst. Use only the supplied project context, visual metrics, and uploaded images. Do not invent market data. Be direct, practical, and specific. If image access is weak or metrics are limited, say so."
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "Analyze these uploaded game art assets for Steam store readability, art direction fit, capsule strength, production risk, and commercial positioning.",
                  "Ground the critique in the visual assets and supplied metrics.",
                  "Do not repeat the numbers mechanically. Explain what they imply for a game studio.",
                  "",
                  "PROJECT",
                  JSON.stringify(input.project, null, 2),
                  "",
                  "VISUAL METRICS AND BENCHMARK CONTEXT",
                  JSON.stringify(input.metrics, null, 2),
                  "",
                  "UPLOADED ASSET METADATA",
                  JSON.stringify(input.assets.map((asset: any) => ({
                    kind: asset.kind,
                    originalName: asset.originalName,
                    width: asset.width,
                    height: asset.height,
                    notes: asset.notes,
                    visualMetrics: asset.visualMetrics
                  })), null, 2),
                  "",
                  "OUTPUT RULES",
                  "- visualCritique: 3-5 sentences on the actual visual direction.",
                  "- firstReadAssessment: judge if the art communicates the fantasy quickly.",
                  "- capsuleAdvice: practical Steam capsule/header improvements.",
                  "- productionAdvice: practical scope and art pipeline advice.",
                  "- marketPositioningAdvice: how the visuals should position against the reference shelf.",
                  "- confidenceNarrative: explain confidence based on image count, metrics, and image quality.",
                  "- priorityFixes: 3 to 6 concrete fixes.",
                  "- strengths: 2 to 5 current strengths.",
                  "- risks: 2 to 5 risks."
                ].join("\n")
              },
              ...imageInputs
            ]
          }
        ],
        max_output_tokens: 1400,
        text: {
          format: {
            type: "json_schema",
            name: "project_art_analysis",
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
      }, "OpenAI art analysis request failed");
      return null;
    }

    const payload = await response.json() as OpenAiResponsePayload;
    const text = payload.output_text?.trim()
      || payload.output
        ?.flatMap((item: any) => item.content ?? [])
        .find((item: any) => item.type === "output_text" && typeof item.text === "string")
        ?.text
        ?.trim();

    if (!text) {
      logger.warn("OpenAI art analysis returned no output text");
      return null;
    }

    return JSON.parse(text) as AiProjectArtAnalysisLayer;
  } catch (error) {
    logger.error({ error }, "OpenAI art analysis request crashed");
    return null;
  }
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
  const fallback: AiSegmentReportLayer = {
    executiveSummary: `This segment shows a ${String((input.segment as { marketSizeLabel?: string }).marketSizeLabel ?? "mixed").toLowerCase()} market shape with enough evidence to support planning, but not enough to skip careful positioning discipline.`,
    demandDrivers: "Demand appears to come from the clearest recurring comp expectations in the segment, so the product and store layer should reinforce those before trying to broaden the message.",
    saturationRead: "The space is workable when the team can explain why this entry deserves attention faster than the median comparable can.",
    pricingRead: "Pricing should orbit the segment center of gravity unless the project clearly exceeds the visible finish and value bar.",
    launchWindowAdvice: "Choose a launch window based on shelf noise, not internal convenience; the segment should be treated as timing-sensitive when recent releases cluster tightly.",
    monetizationRead: "The monetization mix should stay aligned with the dominant buying behavior of the segment unless there is a very explicit reason to diverge.",
    confidenceNarrative: "Confidence should track the depth of comp coverage. Use this report to direct sharper decisions, but keep validating where the data is still thin.",
    actionItems: [
      "Sharpen the store-facing positioning thesis.",
      "Validate pricing against the strongest direct comps.",
      "Review launch timing against recent segment density.",
      "Map the top leaders to a clearer product and messaging gap."
    ]
  };
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

  const result = await requestStructuredOutput<AiSegmentReportLayer>(
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

  return result ?? fallback;
}

import { MarketingCampaignChannel, MarketingCampaignObjective, MarketingCampaignStatus } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageCommerce } from "@/lib/authorization";
import { createMarketingCampaign } from "@/lib/commerce-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  projectId: z.string().optional(),
  name: z.string().min(2),
  channel: z.nativeEnum(MarketingCampaignChannel),
  objective: z.nativeEnum(MarketingCampaignObjective),
  status: z.nativeEnum(MarketingCampaignStatus),
  currencyCode: z.string().min(3).max(3).optional(),
  budgetCents: z.coerce.number().int().nonnegative(),
  spendCents: z.coerce.number().int().nonnegative(),
  impressions: z.coerce.number().int().nonnegative(),
  clicks: z.coerce.number().int().nonnegative(),
  wishlists: z.coerce.number().int().nonnegative(),
  demoDownloads: z.coerce.number().int().nonnegative(),
  conversions: z.coerce.number().int().nonnegative(),
  revenueCents: z.coerce.number().int().nonnegative(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  notes: z.string().optional()
});

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageCommerce(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only commerce managers can manage marketing campaigns.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const campaign = await createMarketingCampaign({
      organizationId: context.organizationId,
      userId: context.userId,
      projectId: body.projectId || null,
      name: body.name,
      channel: body.channel,
      objective: body.objective,
      status: body.status,
      currencyCode: body.currencyCode,
      budgetCents: body.budgetCents,
      spendCents: body.spendCents,
      impressions: body.impressions,
      clicks: body.clicks,
      wishlists: body.wishlists,
      demoDownloads: body.demoDownloads,
      conversions: body.conversions,
      revenueCents: body.revenueCents,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      notes: body.notes
    });

    return ok(campaign, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid campaign payload.");
    }

    return serverError(error instanceof Error ? error.message : "Não foi possível criar a campanha de marketing.");
  }
}

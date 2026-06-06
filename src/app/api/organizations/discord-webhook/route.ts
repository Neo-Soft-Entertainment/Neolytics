import { OrganizationRole } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { sendDiscordWebhook } from "@/lib/discord";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  webhookUrl: z.union([z.string().url(), z.literal("")]).transform((value) => value.trim()),
  enabled: z.boolean()
});

function canManageOrganization(role: OrganizationRole) {
  return role === OrganizationRole.OWNER || role === OrganizationRole.ADMIN;
}

export async function PATCH(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageOrganization(context.organizationRole)) {
    return forbidden("Only organization admins can manage Discord integrations.");
  }

  try {
    const body = await parseJsonBody(request, schema);

    if (body.enabled && !body.webhookUrl) {
      return badRequest("Provide a Discord webhook URL before enabling notifications.");
    }

    const organization = await db.organization.update({
      where: {
        id: context.organizationId
      },
      data: {
        discordWebhookUrl: body.webhookUrl || null,
        discordWebhookEnabled: body.enabled && Boolean(body.webhookUrl)
      },
      select: {
        discordWebhookUrl: true,
        discordWebhookEnabled: true
      }
    });

    return ok(organization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid Discord webhook payload.");
    }

    return serverError("Unable to update Discord webhook settings.");
  }
}

export async function POST() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageOrganization(context.organizationRole)) {
    return forbidden("Only organization admins can manage Discord integrations.");
  }

  const organization = await db.organization.findUnique({
    where: {
      id: context.organizationId
    },
    select: {
      name: true,
      discordWebhookUrl: true,
      discordWebhookEnabled: true
    }
  });

  if (!organization?.discordWebhookUrl || !organization.discordWebhookEnabled) {
    return badRequest("Configure and enable a Discord webhook before sending a test.");
  }

  try {
    await sendDiscordWebhook(organization.discordWebhookUrl, {
      content: `Neolytics Discord integration is active for **${organization.name}**.`,
      embeds: [
        {
          title: "Test notification",
          description: "Your organization can now receive activity alerts from Neolytics.",
          color: 5814783,
          timestamp: new Date().toISOString()
        }
      ]
    });

    return ok({ success: true });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Unable to send Discord test webhook.");
  }
}

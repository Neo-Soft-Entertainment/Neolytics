import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageOrganization } from "@/lib/authorization";
import { createAuditEvent } from "@/lib/audit-service";
import { db } from "@/lib/db";
import { isAllowedDiscordWebhookUrl, sendDiscordWebhook } from "@/lib/discord";
import { parseJsonBody } from "@/lib/request";
import { decryptNullableString, encryptNullableString } from "@/lib/security/encryption";
import { getErrorMessage } from "@/lib/error-message";

const schema = z.object({
  webhookUrl: z.union([z.string().url(), z.literal("")]).optional().transform((value: any) => value?.trim() ?? ""),
  enabled: z.boolean()
});

export async function PATCH(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only organization admins can manage Discord integrations.");
  }

  try {
    const body = await parseJsonBody(request, schema);

    if (body.webhookUrl && !isAllowedDiscordWebhookUrl(body.webhookUrl)) {
      return badRequest("Use a valid Discord webhook URL.");
    }

    const existing = await db.organization.findUnique({
      where: {
        id: context.organizationId
      },
      select: {
        discordWebhookUrl: true
      }
    });
    const nextWebhookUrl = encryptNullableString(
      body.webhookUrl || existing?.discordWebhookUrl,
      `organization:${context.organizationId}:discordWebhookUrl`
    );

    if (body.enabled && !nextWebhookUrl) {
      return badRequest("Provide a Discord webhook URL before enabling notifications.");
    }

    const organization = await db.organization.update({
      where: {
        id: context.organizationId
      },
      data: {
        discordWebhookUrl: nextWebhookUrl,
        discordWebhookEnabled: body.enabled && Boolean(nextWebhookUrl)
      },
      select: {
        discordWebhookEnabled: true
      }
    });

    await createAuditEvent(db, {
      organizationId: context.organizationId,
      userId: context.userId,
      entityType: "integration",
      entityId: context.organizationId,
      action: "integration.discord_webhook.updated",
      metadata: {
        enabled: organization.discordWebhookEnabled,
        configured: Boolean(nextWebhookUrl)
      }
    });

    return ok({
      discordWebhookConfigured: Boolean(nextWebhookUrl),
      discordWebhookEnabled: organization.discordWebhookEnabled
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid Discord webhook payload.");
    }

    return serverError("Não foi possível atualizar as configurações do webhook do Discord.");
  }
}

export async function POST() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageOrganization(context.organizationRole, context.organizationPermissions)) {
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

  const webhookUrl = decryptNullableString(organization?.discordWebhookUrl, `organization:${context.organizationId}:discordWebhookUrl`);

  if (!webhookUrl || !organization?.discordWebhookEnabled) {
    return badRequest("Configure and enable a Discord webhook before sending a test.");
  }

  try {
    await sendDiscordWebhook(webhookUrl, {
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
    return serverError(getErrorMessage(error, "Não foi possível enviar o webhook de teste do Discord."));
  }
}

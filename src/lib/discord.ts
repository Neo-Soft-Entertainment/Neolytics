import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

type DiscordWebhookPayload = {
  content?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
    timestamp?: string;
  }>;
};

export function isAllowedDiscordWebhookUrl(webhookUrl: string) {
  try {
    const url = new URL(webhookUrl);
    const allowedHost = url.hostname === "discord.com" || url.hostname === "discordapp.com";
    return url.protocol === "https:" && allowedHost && url.pathname.startsWith("/api/webhooks/");
  } catch {
    return false;
  }
}

export async function sendDiscordWebhook(webhookUrl: string, payload: DiscordWebhookPayload) {
  if (!isAllowedDiscordWebhookUrl(webhookUrl)) {
    throw new Error("Discord webhook URL is not allowed.");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    return;
  }

  const body = await response.text().catch(() => "");
  throw new Error(`Discord webhook request failed with status ${response.status}${body ? `: ${body}` : ""}`);
}

export async function notifyOrganizationDiscordWebhook(
  organizationId: string,
  payload: DiscordWebhookPayload
) {
  const organization = await db.organization.findUnique({
    where: {
      id: organizationId
    },
    select: {
      discordWebhookUrl: true,
      discordWebhookEnabled: true
    }
  });

  if (!organization?.discordWebhookEnabled || !organization.discordWebhookUrl) {
    return;
  }

  try {
    await sendDiscordWebhook(organization.discordWebhookUrl, payload);
  } catch (error) {
    logger.error({ error, organizationId }, "Discord webhook delivery failed");
  }
}

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

export async function sendDiscordWebhook(webhookUrl: string, payload: DiscordWebhookPayload) {
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

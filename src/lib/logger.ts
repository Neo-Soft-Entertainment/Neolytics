import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  redact: {
    paths: [
      "*.authorization",
      "*.Authorization",
      "*.access_token",
      "*.refresh_token",
      "*.id_token",
      "*.webhookUrl",
      "*.discordWebhookUrl",
      "*.password",
      "*.passwordHash",
      "*.secret",
      "*.token"
    ],
    censor: "[redacted]"
  },
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true
          }
        }
      : undefined
});

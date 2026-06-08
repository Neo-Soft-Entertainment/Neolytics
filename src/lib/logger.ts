import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  redact: {
    paths: [
      "*.authorization",
      "*.Authorization",
      "*.headers.authorization",
      "*.headers.Authorization",
      "*.access_token",
      "*.refresh_token",
      "*.id_token",
      "*.apiKey",
      "*.api_key",
      "*.clientSecret",
      "*.client_secret",
      "*.webhookUrl",
      "*.discordWebhookUrl",
      "*.password",
      "*.passwordHash",
      "*.secret",
      "*.token",
      "*.cookie",
      "*.cookies",
      "*.body.password",
      "*.body.token",
      "*.body.secret",
      "*.body.webhookUrl"
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

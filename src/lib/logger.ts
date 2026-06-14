import pino from "pino";

let resolvedValue0: any;
if (process.env.NODE_ENV === "development") {
  resolvedValue0 = "debug";
} else {
  resolvedValue0 = "info";
}
let resolvedValue1: any;
if (process.env.NODE_ENV === "development") {
  resolvedValue1 = {
          target: "pino-pretty",
          options: {
            colorize: true
          }
        };
} else {
  resolvedValue1 = undefined;
}
export const logger = pino({
  level: resolvedValue0,
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
    resolvedValue1
});

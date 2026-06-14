import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

import { env } from "@/env";

const algorithm = "aes-256-gcm";
const payloadPrefix = "enc:";

export type EncryptedPayload = {
  v: 1;
  alg: "AES-256-GCM";
  keyVersion: string;
  iv: string;
  tag: string;
  ciphertext: string;
};

function decodeKey(value: string) {
  const trimmed = value.trim();
    let resolvedValue0: any;
  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    resolvedValue0 = Buffer.from(trimmed, "hex");
  } else {
    resolvedValue0 = null;
  }
const hex = resolvedValue0;

  if (hex) {
    return hex;
  }

  return Buffer.from(trimmed, "base64");
}

function getKeys() {
  const entries = env.ENCRYPTION_KEYS?.split(",").map((entry) => entry.trim()).filter(Boolean) ?? [];
  const keys = new Map<string, Buffer>();

  for (const entry of entries) {
    const separator = entry.indexOf(":");

    if (separator <= 0) {
      throw new Error("Invalid ENCRYPTION_KEYS entry. Use keyVersion:base64-32-byte-key.");
    }

    const keyVersion = entry.slice(0, separator).trim();
    const key = decodeKey(entry.slice(separator + 1));

    if (key.length !== 32) {
      throw new Error(`Encryption key ${keyVersion} must be 32 bytes for AES-256-GCM.`);
    }

    keys.set(keyVersion, key);
  }

  return keys;
}

function getActiveKey() {
  const keys = getKeys();
  const keyVersion = env.ACTIVE_ENCRYPTION_KEY_VERSION?.trim();

  if (!keyVersion) {
    throw new Error("ACTIVE_ENCRYPTION_KEY_VERSION is required before storing encrypted secrets.");
  }

  const key = keys.get(keyVersion);

  if (!key) {
    throw new Error(`Active encryption key ${keyVersion} is not present in ENCRYPTION_KEYS.`);
  }

  return {
    key,
    keyVersion
  };
}

function encodePayload(payload: EncryptedPayload) {
  return `${payloadPrefix}${Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")}`;
}

function decodePayload(value: string) {
  if (!isEncryptedString(value)) {
    throw new Error("Value is not encrypted.");
  }

  return JSON.parse(Buffer.from(value.slice(payloadPrefix.length), "base64url").toString("utf8")) as EncryptedPayload;
}

function getAad(context?: string) {
  return Buffer.from(context || "neolytics", "utf8");
}

export function isEncryptedString(value?: string | null) {
  return Boolean(value?.startsWith(payloadPrefix));
}

export function encryptString(value: string, context?: string) {
  const { key, keyVersion } = getActiveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  cipher.setAAD(getAad(context));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return encodePayload({
    v: 1,
    alg: "AES-256-GCM",
    keyVersion,
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    ciphertext: ciphertext.toString("base64url")
  });
}

export function decryptString(value: string, context?: string) {
  if (!isEncryptedString(value)) {
    return value;
  }

  const payload = decodePayload(value);

  if (payload.v !== 1 || payload.alg !== "AES-256-GCM") {
    throw new Error("Unsupported encrypted payload version.");
  }

  const key = getKeys().get(payload.keyVersion);

  if (!key) {
    throw new Error(`Encryption key ${payload.keyVersion} is unavailable.`);
  }

  const decipher = createDecipheriv(algorithm, key, Buffer.from(payload.iv, "base64url"));
  decipher.setAAD(getAad(context));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

export function encryptNullableString(value?: string | null, context?: string) {
  if (!value) {
    return null;
  }

  if (isEncryptedString(value)) {
    return value;
  }

  return encryptString(value, context);
}

export function decryptNullableString(value?: string | null, context?: string) {
  if (!value) {
    return null;
  }

  return decryptString(value, context);
}

export function maskSecret(value?: string | null) {
  if (!value) {
    return null;
  }

    let resolvedValue1: any;
  if (isEncryptedString(value)) {
    resolvedValue1 = "[encrypted]";
  } else {
    resolvedValue1 = value;
  }
const decrypted = resolvedValue1;

  if (decrypted === "[encrypted]") {
    return decrypted;
  }

  if (decrypted.length <= 8) {
    return "[configured]";
  }

  return `${decrypted.slice(0, 4)}...${decrypted.slice(-4)}`;
}

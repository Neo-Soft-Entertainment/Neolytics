import { createCipheriv, randomBytes } from "crypto";

const keyV1 = randomBytes(32).toString("base64");
const keyV2 = randomBytes(32).toString("base64");

process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/db";
process.env.AUTH_SECRET ??= "security-self-test-auth-secret";
process.env.STEAM_STORE_BASE_URL ??= "https://store.steampowered.com";
process.env.STEAM_API_BASE_URL ??= "https://api.steampowered.com";
function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  process.env.ENCRYPTION_KEYS = `v1:${keyV1},v2:${keyV2}`;
  process.env.ACTIVE_ENCRYPTION_KEY_VERSION = "v2";

  const {
    decryptString,
    encryptString,
    isEncryptedString
  } = await import("../src/lib/security/encryption");

  const encrypted = encryptString("super-secret-token", "test-context");
  assert(isEncryptedString(encrypted), "Encrypted payload should have the encrypted prefix.");
  assert(decryptString(encrypted, "test-context") === "super-secret-token", "Encrypted payload should decrypt.");

  const rawPayload = JSON.parse(Buffer.from(encrypted.slice("enc:".length), "base64url").toString("utf8")) as {
    tag: string;
  };
  rawPayload.tag = randomBytes(16).toString("base64url");
  const tampered = `enc:${Buffer.from(JSON.stringify(rawPayload), "utf8").toString("base64url")}`;
  let rejectedTamperedPayload = false;

  try {
    decryptString(tampered, "test-context");
  } catch {
    rejectedTamperedPayload = true;
  }

  assert(rejectedTamperedPayload, "Tampered auth tag should be rejected.");

  const legacyIv = randomBytes(12);
  const legacyCipher = createCipheriv("aes-256-gcm", Buffer.from(keyV1, "base64"), legacyIv);
  legacyCipher.setAAD(Buffer.from("legacy-context", "utf8"));
  const legacyCiphertext = Buffer.concat([legacyCipher.update("legacy-secret", "utf8"), legacyCipher.final()]);
  const legacyPayload = `enc:${Buffer.from(JSON.stringify({
    v: 1,
    alg: "AES-256-GCM",
    keyVersion: "v1",
    iv: legacyIv.toString("base64url"),
    tag: legacyCipher.getAuthTag().toString("base64url"),
    ciphertext: legacyCiphertext.toString("base64url")
  }), "utf8").toString("base64url")}`;

  assert(decryptString(legacyPayload, "legacy-context") === "legacy-secret", "Historical key payload should decrypt.");

  console.log("Security self-test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

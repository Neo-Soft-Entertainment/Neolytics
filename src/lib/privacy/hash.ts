import { createHmac } from "crypto";

import { env } from "@/env";

export function hashPrivacyValue(value: string) {
  return createHmac("sha256", env.PRIVACY_HASH_SECRET ?? env.AUTH_SECRET)
    .update(value.trim())
    .digest("hex");
}

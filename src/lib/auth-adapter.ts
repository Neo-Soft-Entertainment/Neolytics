import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterAccount } from "@auth/core/adapters";

import { db } from "@/lib/db";
import { decryptNullableString, encryptNullableString } from "@/lib/security/encryption";

const accountSecretFields = ["access_token", "refresh_token", "id_token", "session_state"] as const;

function secureAccount(account: AdapterAccount) {
  const secured = { ...account } as Record<string, string | undefined>;

  for (const field of accountSecretFields) {
    const value = account[field];
        let resolvedValue0: any;
    if (typeof value === "string") {
      resolvedValue0 = value;
    } else {
      resolvedValue0 = undefined;
    }
secured[field] = encryptNullableString(resolvedValue0, `account:${account.provider}:${account.providerAccountId}`) ?? undefined;
  }

  return secured as AdapterAccount;
}

function revealAccount(account: AdapterAccount | null) {
  if (!account) {
    return null;
  }

  const revealed = { ...account } as Record<string, string | undefined>;

  for (const field of accountSecretFields) {
    const value = account[field];
        let resolvedValue1: any;
    if (typeof value === "string") {
      resolvedValue1 = value;
    } else {
      resolvedValue1 = undefined;
    }
revealed[field] = decryptNullableString(resolvedValue1, `account:${account.provider}:${account.providerAccountId}`) ?? undefined;
  }

  return revealed as AdapterAccount;
}

export function createSecureAuthAdapter(): Adapter {
  const adapter = PrismaAdapter(db);

  return {
    ...adapter,
    linkAccount(account) {
      return adapter.linkAccount?.(secureAccount(account));
    },
    async getAccount(providerAccountId, provider) {
      const account = await adapter.getAccount?.(providerAccountId, provider);
      return revealAccount(account ?? null);
    }
  };
}

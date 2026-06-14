import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const { PrismaClient } = await import("@prisma/client");
const {
  encryptNullableString,
  encryptString,
  isEncryptedString
} = await import("../src/lib/security/encryption");

const apply = process.argv.includes("--apply");
const db = new PrismaClient();
const backup: Array<{
  model: string;
  id: string;
  field: string;
  encryptedOriginalValue: string;
}> = [];

function backupValue(model: string, id: string, field: string, value: string) {
  backup.push({
    model,
    id,
    field,
    encryptedOriginalValue: encryptString(value, `legacy-backup:${model}:${id}:${field}`)
  });
}

try {
  let accountsMigrated = 0;
  let organizationsMigrated = 0;
  const accounts = await db.account.findMany({
    select: {
      provider: true,
      providerAccountId: true,
      access_token: true,
      refresh_token: true,
      id_token: true,
      session_state: true
    }
  });

  for (const account of accounts) {
    const context = `account:${account.provider}:${account.providerAccountId}`;
    const data: Record<string, string | null> = {};

    for (const field of ["access_token", "refresh_token", "id_token", "session_state"] as const) {
      const value = account[field];

      if (!value || isEncryptedString(value)) {
        continue;
      }

      backupValue("Account", `${account.provider}:${account.providerAccountId}`, field, value);
      data[field] = encryptNullableString(value, context);
    }

    if (Object.keys(data).length === 0) {
      continue;
    }

    accountsMigrated += 1;

    if (apply) {
      await db.account.update({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId
          }
        },
        data
      });
    }
  }

  const organizations = await db.organization.findMany({
    select: {
      id: true,
      discordWebhookUrl: true
    }
  });

  for (const organization of organizations) {
    if (!organization.discordWebhookUrl || isEncryptedString(organization.discordWebhookUrl)) {
      continue;
    }

    backupValue("Organization", organization.id, "discordWebhookUrl", organization.discordWebhookUrl);
    organizationsMigrated += 1;

    if (apply) {
      await db.organization.update({
        where: {
          id: organization.id
        },
        data: {
          discordWebhookUrl: encryptNullableString(organization.discordWebhookUrl, `organization:${organization.id}:discordWebhookUrl`)
        }
      });
    }
  }

  if (apply && backup.length > 0) {
    const backupDir = path.join(process.cwd(), "security-backups");
    await mkdir(backupDir, { recursive: true });
    await writeFile(
      path.join(backupDir, `encrypted-secret-migration-${new Date().toISOString().replace(/[:.]/g, "-")}.json`),
      JSON.stringify({
        createdAt: new Date().toISOString(),
        encryptedWith: process.env.ACTIVE_ENCRYPTION_KEY_VERSION,
        records: backup
      }, null, 2),
      "utf8"
    );
  }

  let mode = "dry-run";
  if (apply) {
    mode = "apply";
  }

  console.log(JSON.stringify({
    mode,
    accountRowsNeedingMigration: accountsMigrated,
    organizationRowsNeedingMigration: organizationsMigrated,
    backupRecords: backup.length
  }, null, 2));
} finally {
  await db.$disconnect();
}

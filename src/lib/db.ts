import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function assertEncryptedDatabaseTransport(name: string, value: string | undefined) {
  if (process.env.NODE_ENV !== "production" || !value || !value.startsWith("postgres")) {
    return;
  }

  try {
    const url = new URL(value);
    const sslMode = url.searchParams.get("sslmode")?.toLowerCase();

    if (sslMode === "require" || sslMode === "verify-ca" || sslMode === "verify-full") {
      return;
    }
  } catch {
    throw new Error(`${name} must be a valid Postgres URL with encrypted transport enabled.`);
  }

  throw new Error(`${name} must include sslmode=require, sslmode=verify-ca, or sslmode=verify-full in production.`);
}

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL;

  assertEncryptedDatabaseTransport("DATABASE_URL", value);

  if (!value) {
    return value;
  }

  try {
    const url = new URL(value);

    if (!url.hostname.includes("pooler.supabase.com")) {
      return value;
    }

    if (url.port === "5432") {
      url.port = "6543";
    }

    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
    }

    if (!url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }

    return url.toString();
  } catch {
    return value;
  }
}

assertEncryptedDatabaseTransport("DIRECT_URL", process.env.DIRECT_URL);

let resolvedValue0: any;
if (process.env.NODE_ENV === "development") {
  resolvedValue0 = ["warn", "error"];
} else {
  resolvedValue0 = ["error"];
}
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl()
      }
    },
    log: resolvedValue0
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

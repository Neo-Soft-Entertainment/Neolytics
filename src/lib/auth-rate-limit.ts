import { createHash } from "crypto";

import { db } from "@/lib/db";

const windowMs = 15 * 60 * 1000;
const blockMs = 30 * 60 * 1000;
const maxAttempts = 5;
const publicApiWindowMs = 60 * 1000;
const publicApiMaxAttempts = 120;

export class AuthRateLimitError extends Error {
  constructor(message = "Too many authentication attempts. Try again later.") {
    super(message);
    this.name = "AuthRateLimitError";
  }
}

function hashIdentifier(identifier: string) {
  return createHash("sha256").update(identifier.trim().toLowerCase()).digest("hex");
}

function getIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  if (forwardedFor) {
    return forwardedFor;
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function getLoginRateLimitKey(email: string) {
  return `login:${hashIdentifier(email)}`;
}

export function getSignupRateLimitKey(request: Request) {
  return `signup:${hashIdentifier(getIp(request))}`;
}

export function getPublicApiRateLimitKey(request: Request, scope: string) {
  return `api:${scope}:${hashIdentifier(getIp(request))}`;
}

export async function assertAuthRateLimit(key: string) {
  const record = await db.authRateLimit.findUnique({
    where: {
      key
    }
  });

  if (!record?.blockedUntil || record.blockedUntil <= new Date()) {
    return;
  }

  throw new AuthRateLimitError();
}

export async function recordAuthAttempt(key: string, succeeded: boolean) {
  if (succeeded) {
    await db.authRateLimit.deleteMany({
      where: {
        key
      }
    });
    return;
  }

  const now = new Date();
  const existing = await db.authRateLimit.findUnique({
    where: {
      key
    }
  });
  const isFreshWindow = existing && now.getTime() - existing.lastAttemptAt.getTime() <= windowMs;
  const attempts = isFreshWindow ? existing.attempts + 1 : 1;
  const blockedUntil = attempts >= maxAttempts ? new Date(now.getTime() + blockMs) : null;

  await db.authRateLimit.upsert({
    where: {
      key
    },
    create: {
      key,
      attempts,
      blockedUntil,
      lastAttemptAt: now
    },
    update: {
      attempts,
      blockedUntil,
      lastAttemptAt: now
    }
  });
}

export async function assertPublicApiRateLimit(key: string) {
  const now = new Date();
  const existing = await db.authRateLimit.findUnique({
    where: {
      key
    }
  });

  if (existing && now.getTime() - existing.lastAttemptAt.getTime() <= publicApiWindowMs) {
    if (existing.attempts >= publicApiMaxAttempts) {
      throw new AuthRateLimitError("Too many requests. Try again later.");
    }

    await db.authRateLimit.update({
      where: {
        key
      },
      data: {
        attempts: {
          increment: 1
        },
        lastAttemptAt: now
      }
    });
    return;
  }

  await db.authRateLimit.upsert({
    where: {
      key
    },
    create: {
      key,
      attempts: 1,
      lastAttemptAt: now
    },
    update: {
      attempts: 1,
      blockedUntil: null,
      lastAttemptAt: now
    }
  });
}

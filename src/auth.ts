import { Prisma, PrivacyDecision } from "@prisma/client";
import NextAuth, { CredentialsSignin } from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { z } from "zod";

import { AuthRateLimitError, assertAuthRateLimit, getLoginRateLimitKey, recordAuthAttempt } from "@/lib/auth-rate-limit";
import { createSecureAuthAdapter } from "@/lib/auth-adapter";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createPrivacyAuditLog } from "@/lib/privacy/audit";

if (process.env.AUTH_URL) {
  process.env.APP_URL ??= process.env.AUTH_URL;
  delete process.env.AUTH_URL;
}

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  recaptchaToken: z.string().min(1).optional()
});

const recaptchaAction = "login";
const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY?.trim();
const recaptchaMinimumScore = (() => {
  const score = Number(process.env.RECAPTCHA_MIN_SCORE ?? "0.5");
  return Number.isFinite(score) && score >= 0 && score <= 1 ? score : 0.5;
})();
const isRecaptchaEnabled = Boolean(recaptchaSecretKey && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim());

class RateLimitedCredentialsError extends CredentialsSignin {
  code = "rate_limited";
}

class RecaptchaCredentialsError extends CredentialsSignin {
  code = "recaptcha_failed";
}

async function createLoginAudit(params: {
  userId?: string | null;
  action: string;
  decision: PrivacyDecision;
  reason: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await createPrivacyAuditLog(db, {
    actorId: params.userId ?? null,
    actorRole: null,
    action: params.action,
    resourceType: "auth",
    resourceId: params.userId ?? null,
    decision: params.decision,
    reason: params.reason,
    metadata: params.metadata
  });
}

async function verifyRecaptchaToken(token?: string) {
  if (!isRecaptchaEnabled) {
    return true;
  }

  if (!recaptchaSecretKey || !token) {
    return false;
  }

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      secret: recaptchaSecretKey,
      response: token
    })
  });

  if (!response.ok) {
    return false;
  }

  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
    score?: number;
    action?: string;
  } | null;

  return Boolean(
    payload?.success &&
      payload.action === recaptchaAction &&
      typeof payload.score === "number" &&
      payload.score >= recaptchaMinimumScore
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: createSecureAuthAdapter(),
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 30
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        recaptchaToken: { label: "reCAPTCHA token", type: "text" }
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase();
        const rateLimitKey = getLoginRateLimitKey(email);

        try {
          await assertAuthRateLimit(rateLimitKey);
        } catch (error) {
          if (error instanceof AuthRateLimitError) {
            throw new RateLimitedCredentialsError();
          }

          throw error;
        }

        const isRecaptchaValid = await verifyRecaptchaToken(parsed.data.recaptchaToken);

        if (!isRecaptchaValid) {
          await recordAuthAttempt(rateLimitKey, false);
          await createLoginAudit({
            action: "login.recaptcha_failed",
            decision: PrivacyDecision.BLOCK,
            reason: "reCAPTCHA verification failed.",
            metadata: {
              email
            }
          });
          throw new RecaptchaCredentialsError();
        }

        const user = await db.user.findUnique({
          where: {
            email
          }
        });

        if (!user?.passwordHash) {
          await recordAuthAttempt(rateLimitKey, false);
          await createLoginAudit({
            action: "login.failed",
            decision: PrivacyDecision.BLOCK,
            reason: "User account was not found or has no credentials password.",
            metadata: {
              email
            }
          });
          return null;
        }

        const passwordResult = await verifyPassword(parsed.data.password, user.passwordHash);

        if (!passwordResult.isValid) {
          await recordAuthAttempt(rateLimitKey, false);
          await createLoginAudit({
            userId: user.id,
            action: "login.failed",
            decision: PrivacyDecision.BLOCK,
            reason: "Invalid credentials.",
            metadata: {
              email
            }
          });
          return null;
        }

        if (passwordResult.needsRehash) {
          await db.user.update({
            where: {
              id: user.id
            },
            data: {
              passwordHash: await hashPassword(parsed.data.password)
            }
          });
        }

        await recordAuthAttempt(rateLimitKey, true);
        await createLoginAudit({
          userId: user.id,
          action: "login.succeeded",
          decision: PrivacyDecision.ALLOW,
          reason: "Credentials login succeeded.",
          metadata: {
            email
          }
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image
        };
      }
    }),
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GitHub({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET
          })
        ]
      : []),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
          })
        ]
      : []),
    ...(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
      ? [
          Discord({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET
          })
        ]
      : []),
    ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
      ? [
          Apple({
            clientId: process.env.APPLE_CLIENT_ID,
            clientSecret: process.env.APPLE_CLIENT_SECRET
          })
        ]
      : [])
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      return token;
    },
    async session({ session, token, user }) {
      if (!session.user) {
        return session;
      }

      const userId = user?.id ?? token.sub ?? session.user.id;

      if (!userId) {
        return session;
      }

      session.user.id = userId;

      try {
        const [memberships, dbUser] = await Promise.all([
          db.organizationMember.findMany({
            where: {
              userId
            },
            include: {
              organization: true
            },
            orderBy: {
              joinedAt: "asc"
            }
          }),
          db.user.findUnique({
            where: {
              id: userId
            },
            select: {
              name: true,
              email: true,
              image: true,
              passwordChangedAt: true,
              preferredLanguage: true
            }
          })
        ]);

        if (dbUser?.passwordChangedAt && typeof token.iat === "number" && token.iat * 1000 < dbUser.passwordChangedAt.getTime()) {
          throw new Error("SESSION_INVALIDATED");
        }

        session.user.name = dbUser?.name ?? session.user.name;
        session.user.email = dbUser?.email ?? session.user.email;
        session.user.image = dbUser?.image ?? session.user.image;
        session.user.preferredLanguage = dbUser?.preferredLanguage ?? "en";
        session.user.organizations = memberships.map((membership) => ({
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
          role: membership.role,
          permissions: membership.permissions,
          subscriptionPlan: membership.organization.subscriptionPlan
        }));
      } catch (error) {
        if (error instanceof Error && error.message === "SESSION_INVALIDATED") {
          throw error;
        }

        logger.warn({ error, userId }, "Session enrichment failed");
        session.user.preferredLanguage = session.user.preferredLanguage ?? "en";
        session.user.organizations = session.user.organizations ?? [];
      }

      return session;
    }
  }
});

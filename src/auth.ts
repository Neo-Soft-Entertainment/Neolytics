import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { z } from "zod";

import { AuthRateLimitError, assertAuthRateLimit, getLoginRateLimitKey, recordAuthAttempt } from "@/lib/auth-rate-limit";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

if (process.env.AUTH_URL) {
  process.env.APP_URL ??= process.env.AUTH_URL;
  delete process.env.AUTH_URL;
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

class RateLimitedCredentialsError extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
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
        password: { label: "Password", type: "password" }
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.trim().toLowerCase();
        const rateLimitKey = getLoginRateLimitKey(email);

        try {
          await assertAuthRateLimit(rateLimitKey);
        } catch (error) {
          if (error instanceof AuthRateLimitError) {
            throw new RateLimitedCredentialsError();
          }

          throw error;
        }

        const user = await db.user.findUnique({
          where: {
            email
          }
        });

        if (!user?.passwordHash) {
          await recordAuthAttempt(rateLimitKey, false);
          return null;
        }

        const isValid = await compare(parsed.data.password, user.passwordHash);

        if (!isValid) {
          await recordAuthAttempt(rateLimitKey, false);
          return null;
        }

        await recordAuthAttempt(rateLimitKey, true);

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

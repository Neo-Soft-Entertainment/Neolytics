import { PrismaClient, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

import { env } from "@/env";
import { hashPassword } from "@/lib/password";

function getCurrentSubscriptionPeriodRange(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));

  return { start, end };
}

const prisma = new PrismaClient();

async function main() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    return;
  }

  if (env.ADMIN_PASSWORD === "ChangeMe123!") {
    throw new Error("ADMIN_PASSWORD must not use the documented placeholder value.");
  }

  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
  const period = getCurrentSubscriptionPeriodRange();

  const user = await prisma.user.upsert({
    where: {
      email: env.ADMIN_EMAIL
    },
    update: {
      passwordHash
    },
    create: {
      email: env.ADMIN_EMAIL,
      name: "Neolytics Admin",
      passwordHash
    }
  });

  const organization = await prisma.organization.upsert({
    where: {
      slug: "demo-org"
    },
    update: {
      subscriptionPlan: SubscriptionPlan.PRO,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionCurrentPeriodStart: period.start,
      subscriptionCurrentPeriodEnd: period.end,
      subscriptionCanceledAt: null
    },
    create: {
      name: "Demo Organization",
      slug: "demo-org",
      subscriptionPlan: SubscriptionPlan.PRO,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionCurrentPeriodStart: period.start,
      subscriptionCurrentPeriodEnd: period.end
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id
      }
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: "OWNER"
    }
  });

  await prisma.workspace.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: "default"
      }
    },
    update: {},
    create: {
      organizationId: organization.id,
      createdById: user.id,
      name: "Default Workspace",
      slug: "default",
      description: "Initial workspace"
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

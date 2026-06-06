import { hash } from "bcryptjs";

import { PrismaClient, SubscriptionPlan } from "@prisma/client";

import { env } from "@/env";

const prisma = new PrismaClient();

async function main() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    return;
  }

  const passwordHash = await hash(env.ADMIN_PASSWORD, 12);

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
    update: {},
    create: {
      name: "Demo Organization",
      slug: "demo-org",
      subscriptionPlan: SubscriptionPlan.STUDIO
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

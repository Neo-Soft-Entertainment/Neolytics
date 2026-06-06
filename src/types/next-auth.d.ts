import { OrganizationRole, SubscriptionPlan } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      organizations: Array<{
        id: string;
        name: string;
        slug: string;
        role: OrganizationRole;
        subscriptionPlan: SubscriptionPlan;
      }>;
    };
  }

  interface User {
    id: string;
  }
}

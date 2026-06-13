import { OrganizationPermission, OrganizationRole, SubscriptionPlan } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      preferredLanguage: string;
      organizations: Array<{
        id: string;
        name: string;
        slug: string;
        role: OrganizationRole;
        permissions: OrganizationPermission[];
        subscriptionPlan: SubscriptionPlan;
      }>;
    };
  }

  interface User {
    id: string;
  }
}

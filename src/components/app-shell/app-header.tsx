import { OrganizationRole, SubscriptionPlan } from "@prisma/client";

import { OrganizationSwitcher } from "@/components/app-shell/organization-switcher";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { SignOutButton } from "@/components/auth/signout-button";
import { NeolyticsBrand } from "@/components/brand/neolytics-brand";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { getSubscriptionPlanLabel } from "@/lib/subscription-plans";

interface AppHeaderProps {
  currentOrganizationId: string;
  organizationName: string;
  organizations: Array<{
    id: string;
    name: string;
    role: OrganizationRole;
    subscriptionPlan: SubscriptionPlan;
  }>;
  subscriptionPlan: SubscriptionPlan;
}

export function AppHeader({
  currentOrganizationId,
  organizationName,
  organizations,
  subscriptionPlan
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/85 px-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <NeolyticsBrand href="/dashboard" showWordmark={false} />
          <span className="hidden text-sm font-semibold tracking-tight text-foreground lg:inline">
            Neolytics
          </span>
        </div>
        <div className="min-w-0">
          <OrganizationSwitcher currentOrganizationId={currentOrganizationId} organizations={organizations} />
          <p className="sr-only">{organizationName}</p>
          <Badge variant="secondary" className="mt-1">
            {getSubscriptionPlanLabel(subscriptionPlan)}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="hidden lg:block">
          <SignOutButton />
        </div>
        <MobileNav />
      </div>
    </header>
  );
}

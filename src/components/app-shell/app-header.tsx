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
  organizations,
  subscriptionPlan
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/65 px-4 backdrop-blur-2xl lg:px-8 relative">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px shimmer-divider opacity-70" />
      <div className="flex min-h-16 flex-col justify-center gap-3 py-3 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:py-0">
      <div className="flex items-start gap-3 lg:items-center">
        <div className="flex shrink-0 items-center gap-3 rounded-full border border-white/10 bg-white/55 px-2.5 py-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:bg-white/[0.04] lg:hidden">
          <NeolyticsBrand className="text-base" href="/dashboard" />
        </div>
        <div className="min-w-0 flex-1 rounded-[1.35rem] border border-white/10 bg-white/40 px-3 py-2.5 backdrop-blur-xl dark:bg-white/[0.03] lg:max-w-md">
          <p className="mb-1 text-[10px] uppercase tracking-[0.26em] text-muted-foreground">
            Organization
          </p>
          <OrganizationSwitcher currentOrganizationId={currentOrganizationId} organizations={organizations} />
          <Badge variant="secondary" className="mt-2 border-white/10 bg-white/60 text-[11px] backdrop-blur dark:bg-white/5">
            {getSubscriptionPlanLabel(subscriptionPlan)}
          </Badge>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <ThemeToggle />
        <div className="hidden lg:block">
          <SignOutButton />
        </div>
        <MobileNav />
      </div>
      </div>
    </header>
  );
}

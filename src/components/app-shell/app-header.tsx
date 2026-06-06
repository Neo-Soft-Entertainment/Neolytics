import { SubscriptionPlan } from "@prisma/client";
import { Building2 } from "lucide-react";

import { MobileNav } from "@/components/app-shell/mobile-nav";
import { SignOutButton } from "@/components/auth/signout-button";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { getSubscriptionPlanLabel } from "@/lib/subscription-plans";

interface AppHeaderProps {
  organizationName: string;
  subscriptionPlan: SubscriptionPlan;
}

export function AppHeader({ organizationName, subscriptionPlan }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/85 px-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium">{organizationName}</p>
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

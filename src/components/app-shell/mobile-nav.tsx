"use client";

import type { OrganizationRole, SubscriptionPlan } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { SignOutButton } from "@/components/auth/signout-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { getCurrentNavItem, navItems, navSections } from "@/components/app-shell/navigation";
import { Button } from "@/components/ui/button";
import { getSubscriptionPlanLabel } from "@/lib/subscription-plans";
import { cn } from "@/lib/utils";

export function MobileNav({
  currentOrganizationName,
  currentOrganizationRole,
  currentWorkspaceName,
  subscriptionPlan
}: {
  currentOrganizationName: string;
  currentOrganizationRole?: OrganizationRole | null;
  currentWorkspaceName: string;
  subscriptionPlan: SubscriptionPlan;
}) {
  const pathname = usePathname();
  const t = useI18n();
  const currentItem = getCurrentNavItem(pathname);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="border-white/15 bg-white/60 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden dark:bg-white/5">
          <Menu className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 border-white/10 bg-background/95 p-2 backdrop-blur-xl">
        <div className="rounded-2xl border border-white/10 bg-white/45 px-3 py-3 dark:bg-white/[0.04]">
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Neolytics</p>
          <p className="mt-2 text-sm font-medium">{currentOrganizationName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {currentOrganizationRole ? `Acesso ${currentOrganizationRole}` : t("shell.activeOrganization")} · {getSubscriptionPlanLabel(subscriptionPlan)}
          </p>
          <p className="mt-2 truncate text-xs text-muted-foreground">
            {currentItem ? t(currentItem.labelKey) : t("shell.workspace")} · {currentWorkspaceName}
          </p>
        </div>
        {navSections.map((section) => (
          <div key={section.key}>
            <DropdownMenuSeparator />
            <p className="px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              {t(section.labelKey)}
            </p>
            {navItems.filter((item) => item.section === section.key).map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link className={cn("min-h-10 rounded-xl px-3", pathname === item.href && "bg-cyan-500/10 font-semibold text-cyan-700 dark:text-cyan-200")} href={item.href}>
                  {t(item.labelKey)}
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
        <DropdownMenuSeparator />
        <div className="p-2">
          <SignOutButton />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

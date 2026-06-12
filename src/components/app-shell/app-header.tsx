"use client";

import type { OrganizationRole, SubscriptionPlan } from "@prisma/client";
import { usePathname } from "next/navigation";

import { useI18n } from "@/components/i18n-provider";
import { getCurrentNavItem, getNavSection } from "@/components/app-shell/navigation";
import { OrganizationSwitcher } from "@/components/app-shell/organization-switcher";
import { WorkspaceSwitcher } from "@/components/app-shell/workspace-switcher";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { NeolyticsBrand } from "@/components/brand/neolytics-brand";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { UserAccountMenu } from "@/components/app-shell/user-account-menu";
import { Badge } from "@/components/ui/badge";
import { getSubscriptionPlanLabel } from "@/lib/subscription-plans";

interface AppHeaderProps {
  currentOrganizationId: string;
  organizationName: string;
  currentWorkspaceId?: string | null;
  currentWorkspaceName?: string | null;
  workspaces: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
  }>;
  organizations: Array<{
    id: string;
    name: string;
    role: OrganizationRole;
    subscriptionPlan: SubscriptionPlan;
  }>;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    preferredLanguage: string;
  };
  languageOptions: Array<{
    value: string;
    label: string;
  }>;
  subscriptionPlan: SubscriptionPlan;
}

export function AppHeader({
  currentOrganizationId,
  organizationName,
  currentWorkspaceId,
  currentWorkspaceName,
  workspaces,
  organizations,
  user,
  languageOptions,
  subscriptionPlan
}: AppHeaderProps) {
  const t = useI18n();
  const pathname = usePathname();
  const currentOrganization = organizations.find((organization) => organization.id === currentOrganizationId);
  const currentItem = getCurrentNavItem(pathname);
  const currentSection = getNavSection(currentItem?.section);

  return (
    <header className="sticky top-0 z-30 border-b border-cyan-300/10 bg-background/72 px-4 shadow-[0_18px_50px_rgba(2,8,23,0.08)] backdrop-blur-2xl lg:px-8 relative">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px shimmer-divider opacity-70" />
      <div className="flex flex-col gap-3 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 shrink items-center gap-3 rounded-full border border-cyan-300/15 bg-white/65 px-2.5 py-1.5 shadow-[0_10px_30px_rgba(8,47,73,0.1)] backdrop-blur-xl dark:bg-white/[0.04]">
            <NeolyticsBrand className="text-base" href="/dashboard" />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserAccountMenu
              email={user.email}
              image={user.image}
              languageOptions={languageOptions}
              name={user.name}
              preferredLanguage={user.preferredLanguage}
            />
            <MobileNav
              currentOrganizationName={currentOrganization?.name ?? organizationName}
              currentOrganizationRole={currentOrganization?.role}
              currentWorkspaceName={currentWorkspaceName ?? workspaces[0]?.name ?? t("shell.workspace")}
              subscriptionPlan={subscriptionPlan}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <div className="px-1">
            <OrganizationSwitcher
              currentOrganizationId={currentOrganizationId}
              fallbackOrganizationName={organizationName}
              organizations={organizations}
            />
          </div>
          <div className="px-1">
            <WorkspaceSwitcher
              currentWorkspaceId={currentWorkspaceId}
              fallbackWorkspaceName={currentWorkspaceName}
              workspaces={workspaces}
            />
          </div>
          <Badge variant="secondary" className="w-fit border-cyan-300/15 bg-cyan-50/80 text-[11px] text-cyan-950 backdrop-blur dark:bg-cyan-300/10 dark:text-cyan-100">
            {getSubscriptionPlanLabel(subscriptionPlan)}
          </Badge>
        </div>
      </div>

      <div className="hidden items-center justify-between gap-4 py-3 lg:flex">
        <div className="flex min-w-0 max-w-4xl flex-1 items-center gap-3">
          <div className="min-w-[132px] px-1">
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              {currentSection ? t(currentSection.labelKey) : t("shell.navOverview")}
            </p>
            <p className="mt-1 truncate text-sm font-semibold">
              {currentItem ? t(currentItem.labelKey) : "Neolytics"}
            </p>
          </div>
          <div className="min-w-0 min-w-[240px] max-w-[320px] px-1">
            <OrganizationSwitcher
              currentOrganizationId={currentOrganizationId}
              fallbackOrganizationName={organizationName}
              organizations={organizations}
            />
          </div>
          <div className="min-w-0 min-w-[220px] max-w-[300px] px-1">
            <WorkspaceSwitcher
              currentWorkspaceId={currentWorkspaceId}
              fallbackWorkspaceName={currentWorkspaceName}
              workspaces={workspaces}
            />
          </div>
          <Badge variant="secondary" className="w-fit border-cyan-300/15 bg-cyan-50/80 text-[11px] text-cyan-950 backdrop-blur dark:bg-cyan-300/10 dark:text-cyan-100">
            {getSubscriptionPlanLabel(subscriptionPlan)}
          </Badge>
        </div>

        <div className="flex items-center justify-end gap-2">
          <ThemeToggle />
          <UserAccountMenu
            email={user.email}
            image={user.image}
            languageOptions={languageOptions}
            name={user.name}
            preferredLanguage={user.preferredLanguage}
          />
        </div>
      </div>
    </header>
  );
}

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

    let resolvedValue0: any;
  if (currentSection) {
    resolvedValue0 = t(currentSection.labelKey);
  } else {
    resolvedValue0 = t("shell.navOverview");
  }
  let resolvedValue1: any;
  if (currentItem) {
    resolvedValue1 = t(currentItem.labelKey);
  } else {
    resolvedValue1 = "Neolytics";
  }
return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 shadow-sm lg:px-8 relative">
      <div className="flex flex-col gap-3 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 shrink items-center gap-3 rounded-lg border border-border bg-card px-2.5 py-1.5 shadow-sm">
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
          <Badge variant="secondary" className="w-fit border-border bg-secondary text-[11px] text-secondary-foreground">
            {getSubscriptionPlanLabel(subscriptionPlan)}
          </Badge>
        </div>
      </div>

      <div className="hidden items-center justify-between gap-4 py-3 lg:flex">
        <div className="flex min-w-0 max-w-4xl flex-1 items-center gap-3">
          <div className="min-w-[132px] px-1">
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              {resolvedValue0}
            </p>
            <p className="mt-1 truncate text-sm font-semibold">
              {resolvedValue1}
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
          <Badge variant="secondary" className="w-fit border-border bg-secondary text-[11px] text-secondary-foreground">
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

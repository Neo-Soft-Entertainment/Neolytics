import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Clapperboard,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Search,
  Settings,
  Users2,
  Wallet
} from "lucide-react";

import type { TranslationKey } from "@/lib/i18n";

export type AppNavSection = "overview" | "analytics" | "operations" | "admin";

export type AppNavItem = {
  href: string;
  icon: LucideIcon;
  labelKey: TranslationKey;
  section: AppNavSection;
};

export const navSections: Array<{ key: AppNavSection; labelKey: TranslationKey }> = [
  { key: "overview", labelKey: "shell.navOverview" },
  { key: "analytics", labelKey: "shell.navAnalytics" },
  { key: "operations", labelKey: "shell.navOperations" },
  { key: "admin", labelKey: "shell.navAdmin" }
];

export const navItems: AppNavItem[] = [
  { href: "/dashboard", labelKey: "shell.dashboard", icon: LayoutDashboard, section: "overview" },
  { href: "/games", labelKey: "shell.games", icon: Search, section: "analytics" },
  { href: "/compare", labelKey: "shell.compare", icon: BarChart3, section: "analytics" },
  { href: "/opportunities", labelKey: "shell.opportunities", icon: BriefcaseBusiness, section: "analytics" },
  { href: "/reports", labelKey: "shell.reports", icon: FileText, section: "analytics" },
  { href: "/projects", labelKey: "shell.projects", icon: FolderKanban, section: "operations" },
  { href: "/demo-manager", labelKey: "shell.demoManager", icon: Clapperboard, section: "operations" },
  { href: "/finance", labelKey: "shell.finance", icon: Wallet, section: "operations" },
  { href: "/company", labelKey: "shell.company", icon: Building2, section: "operations" },
  { href: "/community", labelKey: "shell.community", icon: Users2, section: "operations" },
  { href: "/settings", labelKey: "shell.settings", icon: Settings, section: "admin" }
];

export function getCurrentNavItem(pathname: string) {
  return navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? null;
}

export function getNavSection(section: AppNavSection | undefined) {
  return navSections.find((item) => item.key === section) ?? null;
}

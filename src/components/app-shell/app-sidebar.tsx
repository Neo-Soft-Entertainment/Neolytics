"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BriefcaseBusiness, Building2, FileText, FolderKanban, LayoutDashboard, Search, Settings, Users2, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/company", label: "Company", icon: Building2 },
  { href: "/community", label: "Community", icon: Users2 },
  { href: "/games", label: "Games", icon: Search },
  { href: "/compare", label: "Compare", icon: BarChart3 },
  { href: "/opportunities", label: "Opportunities", icon: BriefcaseBusiness },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r bg-card/70 lg:flex">
      <div className="border-b px-6 py-5">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          Neolytics
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

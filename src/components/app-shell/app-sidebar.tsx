"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BriefcaseBusiness, Building2, FileText, FolderKanban, LayoutDashboard, Search, Settings, Users2, Wallet } from "lucide-react";

import { NeolyticsBrand } from "@/components/brand/neolytics-brand";
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
    <aside className="hidden w-72 flex-col border-r border-white/10 bg-[radial-gradient(circle_at_top,#164e63_0%,#0f172a_25%,#020617_85%)] text-slate-100 lg:flex">
      <div className="relative overflow-hidden border-b border-white/10 px-6 py-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-cyan-400/12 via-sky-400/8 to-transparent" />
        <NeolyticsBrand
          href="/dashboard"
          className="animate-rise-in"
        />
        <p className="mt-3 text-xs uppercase tracking-[0.3em] text-slate-400">
          Studio ERP + Market OS
        </p>
        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">Today</p>
          <p className="mt-2 text-sm font-medium text-white">Track demand, validate projects, and run studio finance, company, and execution operations from one place.</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1.5 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm transition-all duration-300",
                isActive
                  ? "bg-gradient-to-r from-cyan-500/26 via-sky-500/20 to-transparent text-white shadow-[0_14px_30px_rgba(14,165,233,0.1),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "text-slate-400 hover:bg-white/6 hover:text-white hover:translate-x-1"
              )}
            >
              <span className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border border-transparent bg-white/[0.03] transition-all duration-300",
                isActive
                  ? "border-cyan-300/20 bg-cyan-400/10"
                  : "group-hover:border-white/10 group-hover:bg-white/[0.06]"
              )}>
                <Icon className={cn("h-4 w-4 transition-transform duration-300 group-hover:scale-110", isActive && "text-cyan-300")} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

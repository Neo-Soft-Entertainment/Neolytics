"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { NeolyticsBrand } from "@/components/brand/neolytics-brand";
import { navItems, navSections } from "@/components/app-shell/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  const t = useI18n();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setIsCollapsed(window.localStorage.getItem("neolytics.sidebarCollapsed") === "true");
  }, []);

  function toggleSidebar() {
    setIsCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("neolytics.sidebarCollapsed", String(next));
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "hidden flex-col border-r border-cyan-300/10 bg-[radial-gradient(circle_at_18%_0%,#155e75_0%,#0b2a4a_28%,#020617_82%)] text-slate-100 shadow-[18px_0_60px_rgba(2,8,23,0.24)] transition-[width] duration-300 lg:flex",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className={cn("relative overflow-hidden border-b border-white/10 py-5", isCollapsed ? "px-3" : "px-5")}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-cyan-300/18 via-sky-500/10 to-transparent" />
        <NeolyticsBrand
          href="/dashboard"
          showWordmark={!isCollapsed}
          className={cn("animate-rise-in", isCollapsed && "justify-center")}
        />
        {!isCollapsed ? (
          <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">
            {t("shell.sidebarTagline")}
          </p>
        ) : null}
      </div>
      <nav className={cn("flex flex-col gap-3 p-3", isCollapsed && "items-center")}>
        {navSections.map((section) => (
          <div key={section.key} className={cn("space-y-1", isCollapsed && "w-full")}>
            {!isCollapsed ? (
              <p className="px-3 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                {t(section.labelKey)}
              </p>
            ) : null}
            {navItems.filter((item) => item.section === section.key).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-[background-color,color,transform] duration-200",
                    isCollapsed && "justify-center px-2",
                    isActive
                      ? "bg-gradient-to-r from-cyan-400/28 via-sky-500/20 to-transparent text-white shadow-[0_14px_34px_rgba(14,165,233,0.16),inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : "text-slate-400 hover:bg-cyan-300/8 hover:text-white hover:translate-x-1"
                  )}
                  title={t(item.labelKey)}
                >
                  <span className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl border border-transparent bg-white/[0.03] transition-colors duration-200",
                    isActive
                      ? "border-cyan-200/30 bg-cyan-300/14"
                      : "group-hover:border-cyan-200/12 group-hover:bg-white/[0.06]"
                  )}>
                    <Icon className={cn("h-4 w-4 transition-transform duration-200 group-hover:scale-110", isActive && "text-cyan-300")} />
                  </span>
                  {!isCollapsed ? <span>{t(item.labelKey)}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
        <button
          type="button"
          className={cn(
            "mt-2 flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 shadow-[0_12px_28px_rgba(15,23,42,0.22)] transition hover:bg-white/10 hover:text-white",
            isCollapsed ? "mx-auto w-10" : "w-full"
          )}
          onClick={toggleSidebar}
          aria-label={isCollapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar")}
          title={isCollapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar")}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </nav>
    </aside>
  );
}

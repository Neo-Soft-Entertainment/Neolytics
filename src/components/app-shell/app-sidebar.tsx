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
        "hidden flex-col border-r border-white/10 bg-[#11161d] text-slate-100 shadow-[12px_0_40px_rgba(2,8,23,0.18)] transition-[width] duration-300 lg:flex",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className={cn("relative overflow-hidden border-b border-white/10 py-5", isCollapsed ? "px-3" : "px-5")}>
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
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-[background-color,color] duration-200",
                    isCollapsed && "justify-center px-2",
                    isActive
                      ? "bg-white/[0.09] text-white shadow-[inset_3px_0_0_hsl(var(--primary))]"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  )}
                  title={t(item.labelKey)}
                >
                  <span className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md border border-transparent bg-white/[0.03] transition-colors duration-200",
                    isActive
                      ? "border-white/10 bg-white/[0.08]"
                      : "group-hover:border-white/10 group-hover:bg-white/[0.06]"
                  )}>
                    <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
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
            "mt-2 flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/10 hover:text-white",
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

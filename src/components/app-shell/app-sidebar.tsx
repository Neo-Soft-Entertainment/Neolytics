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
    setIsCollapsed((current: any) => {
      const next = !current;
      window.localStorage.setItem("neolytics.sidebarCollapsed", String(next));
      return next;
    });
  }

    let resolvedValue0: any;
  if (isCollapsed) {
    resolvedValue0 = "w-20";
  } else {
    resolvedValue0 = "w-64";
  }
  let resolvedValue1: any;
  if (isCollapsed) {
    resolvedValue1 = "px-3";
  } else {
    resolvedValue1 = "px-5";
  }
  let resolvedValue6: any;
  if (isCollapsed) {
    resolvedValue6 = "mx-auto w-10";
  } else {
    resolvedValue6 = "w-full";
  }
  let resolvedValue7: any;
  if (isCollapsed) {
    resolvedValue7 = t("shell.expandSidebar");
  } else {
    resolvedValue7 = t("shell.collapseSidebar");
  }
  let resolvedValue8: any;
  if (isCollapsed) {
    resolvedValue8 = t("shell.expandSidebar");
  } else {
    resolvedValue8 = t("shell.collapseSidebar");
  }
  let resolvedValue9: any;
  if (isCollapsed) {
    resolvedValue9 = <ChevronRight className="h-4 w-4" />;
  } else {
    resolvedValue9 = <ChevronLeft className="h-4 w-4" />;
  }
return (
    <aside
      className={cn(
        "hidden flex-col border-r border-white/10 bg-[#11161d] text-slate-100 shadow-[12px_0_40px_rgba(2,8,23,0.18)] transition-[width] duration-300 lg:flex",
        resolvedValue0
      )}
    >
      <div className={cn("relative overflow-hidden border-b border-white/10 py-5", resolvedValue1)}>
        <NeolyticsBrand
          href="/dashboard"
          showWordmark={!isCollapsed}
          className={cn("animate-rise-in", isCollapsed && "justify-center")}
        />
      </div>
      <nav className={cn("flex flex-col gap-3 p-3", isCollapsed && "items-center")}>
        {navSections.map((section) => {
          let resolvedValue2: any;
          if (!isCollapsed) {
            resolvedValue2 = (
              <p className="px-3 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                {t(section.labelKey)}
              </p>
            );
          } else {
            resolvedValue2 = null;
          }
          return (
          <div key={section.key} className={cn("space-y-1", isCollapsed && "w-full")}>
            {resolvedValue2}
            {navItems.filter((item: any) => item.section === section.key).map((item: any) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

                            let resolvedValue3: any;
              if (isActive) {
                resolvedValue3 = "bg-white/[0.09] text-white shadow-[inset_3px_0_0_hsl(var(--primary))]";
              } else {
                resolvedValue3 = "text-slate-400 hover:bg-white/[0.05] hover:text-white";
              }
              let resolvedValue4: any;
              if (isActive) {
                resolvedValue4 = "border-white/10 bg-white/[0.08]";
              } else {
                resolvedValue4 = "group-hover:border-white/10 group-hover:bg-white/[0.06]";
              }
              let resolvedValue5: any;
              if (!isCollapsed) {
                resolvedValue5 = <span>{t(item.labelKey)}</span>;
              } else {
                resolvedValue5 = null;
              }
return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-[background-color,color] duration-200",
                    isCollapsed && "justify-center px-2",
                    resolvedValue3
                  )}
                  title={t(item.labelKey)}
                >
                  <span className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md border border-transparent bg-white/[0.03] transition-colors duration-200",
                    resolvedValue4
                  )}>
                    <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
                  </span>
                  {resolvedValue5}
                </Link>
              );
            })}
          </div>
        );
        })}
        <button
          type="button"
          className={cn(
            "mt-2 flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/10 hover:text-white",
            resolvedValue6
          )}
          onClick={toggleSidebar}
          aria-label={resolvedValue7}
          title={resolvedValue8}
        >
          {resolvedValue9}
        </button>
      </nav>
    </aside>
  );
}

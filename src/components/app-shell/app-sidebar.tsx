"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/components/i18n-provider";
import { NeolyticsBrand } from "@/components/brand/neolytics-brand";
import { getCurrentNavItem, getNavSection, navItems, navSections } from "@/components/app-shell/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  const t = useI18n();
  const currentItem = getCurrentNavItem(pathname);
  const currentSection = getNavSection(currentItem?.section);

  return (
    <aside className="hidden w-64 flex-col border-r border-white/10 bg-[radial-gradient(circle_at_top,#164e63_0%,#0f172a_24%,#020617_82%)] text-slate-100 lg:flex">
      <div className="relative overflow-hidden border-b border-white/10 px-5 py-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-400/12 via-sky-400/8 to-transparent" />
        <NeolyticsBrand
          href="/dashboard"
          className="animate-rise-in"
        />
        <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">
          {t("shell.sidebarTagline")}
        </p>
        <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">
            {currentSection ? t(currentSection.labelKey) : t("shell.today")}
          </p>
          <p className="mt-2 text-sm font-medium text-white">{currentItem ? t(currentItem.labelKey) : t("shell.sidebarCopy")}</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-3 p-3">
        {navSections.map((section) => (
          <div key={section.key} className="space-y-1">
            <p className="px-3 text-[10px] uppercase tracking-[0.24em] text-slate-500">
              {t(section.labelKey)}
            </p>
            {navItems.filter((item) => item.section === section.key).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-[background-color,color,transform] duration-200",
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/26 via-sky-500/20 to-transparent text-white shadow-[0_14px_30px_rgba(14,165,233,0.1),inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "text-slate-400 hover:bg-white/6 hover:text-white hover:translate-x-1"
                  )}
                >
                  <span className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl border border-transparent bg-white/[0.03] transition-colors duration-200",
                    isActive
                      ? "border-cyan-300/20 bg-cyan-400/10"
                      : "group-hover:border-white/10 group-hover:bg-white/[0.06]"
                  )}>
                    <Icon className={cn("h-4 w-4 transition-transform duration-200 group-hover:scale-110", isActive && "text-cyan-300")} />
                  </span>
                  <span>{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

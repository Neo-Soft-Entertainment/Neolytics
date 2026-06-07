import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function NeolyticsBrand({
  href = "/",
  showWordmark = true,
  className
}: {
  href?: string;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3 transition-transform duration-300 hover:-translate-y-0.5", className)}>
      <span className="relative flex h-11 w-11 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-[0_18px_40px_rgba(14,165,233,0.28)] ring-1 ring-cyan-400/30">
        <Image
          src="/neolytics-logo.jpg"
          alt="Neolytics logo"
          fill
          sizes="44px"
          className="object-cover"
          priority
        />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-cyan-400/12" />
      </span>
      {showWordmark ? (
        <span className="flex flex-col leading-none">
          <span className="bg-gradient-to-r from-slate-950 via-cyan-700 to-sky-500 bg-clip-text text-lg font-bold tracking-[-0.06em] text-transparent dark:from-white dark:via-cyan-200 dark:to-sky-400 sm:text-xl">
            Neolytics
          </span>
          <span className="mt-1 hidden text-[10px] uppercase tracking-[0.28em] text-muted-foreground sm:block">
            Game Studio ERP
          </span>
        </span>
      ) : null}
    </Link>
  );
}

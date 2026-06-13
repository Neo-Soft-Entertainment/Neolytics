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
      <span className="relative flex h-11 w-11 overflow-hidden rounded-2xl border border-sky-200/20 bg-[#02062c] shadow-[0_18px_46px_rgba(0,195,255,0.28)] ring-1 ring-sky-300/35">
        <Image
          src="/neolytics-icon.png"
          alt="Neolytics logo"
          fill
          sizes="44px"
          className="object-cover"
          priority
        />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/16 via-transparent to-sky-300/16" />
      </span>
      {showWordmark ? (
        <span className="flex flex-col leading-none">
          <span className="bg-gradient-to-r from-[#02062c] via-blue-700 to-sky-500 bg-clip-text text-lg font-bold tracking-[-0.06em] text-transparent dark:from-white dark:via-sky-200 dark:to-blue-300 sm:text-xl">
            Neolytics
          </span>
        </span>
      ) : null}
    </Link>
  );
}

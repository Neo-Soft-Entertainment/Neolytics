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
    <Link href={href} className={cn("inline-flex items-center gap-3", className)}>
      <span className="relative flex h-11 w-11 overflow-hidden rounded-xl border border-white/10 bg-slate-950 shadow-lg shadow-cyan-500/10">
        <Image
          src="/neolytics-logo.jpg"
          alt="Neolytics logo"
          fill
          sizes="44px"
          className="object-cover"
          priority
        />
      </span>
      {showWordmark ? (
        <span className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          Neolytics
        </span>
      ) : null}
    </Link>
  );
}

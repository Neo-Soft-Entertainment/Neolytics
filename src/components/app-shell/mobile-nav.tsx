"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { SignOutButton } from "@/components/auth/signout-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/finance", label: "Finance" },
  { href: "/company", label: "Company" },
  { href: "/community", label: "Community" },
  { href: "/games", label: "Games" },
  { href: "/compare", label: "Compare" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" }
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="border-white/15 bg-white/60 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden dark:bg-white/5">
          <Menu className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 border-white/10 bg-background/90 p-1 backdrop-blur-xl">
        {items.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link className={cn("rounded-xl", pathname === item.href && "bg-cyan-500/10 font-semibold text-cyan-700 dark:text-cyan-200")} href={item.href}>
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="p-2">
          <SignOutButton />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

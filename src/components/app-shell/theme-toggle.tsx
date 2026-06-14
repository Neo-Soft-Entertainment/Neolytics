"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    setIsMounted(true);
  }, []);

    let resolvedValue1: any;
  if (isMounted && isDark) {
    resolvedValue1 = <SunMedium className="h-4 w-4" />;
  } else {
    resolvedValue1 = <MoonStar className="h-4 w-4" />;
  }
return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        let resolvedValue0: any;
        if (isDark) {
          resolvedValue0 = "light";
        } else {
          resolvedValue0 = "dark";
        }
        return setTheme(resolvedValue0);
      }}
      aria-label="Toggle theme"
    >
      {resolvedValue1}
    </Button>
  );
}

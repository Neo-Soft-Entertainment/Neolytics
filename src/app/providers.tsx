"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

import { I18nProvider } from "@/components/i18n-provider";
import { makeQueryClient } from "@/lib/query-client";

export function Providers({
  children,
  language
}: {
  children: React.ReactNode;
  language?: string | null;
}) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <I18nProvider language={language}>
      <SessionProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </ThemeProvider>
      </SessionProvider>
    </I18nProvider>
  );
}

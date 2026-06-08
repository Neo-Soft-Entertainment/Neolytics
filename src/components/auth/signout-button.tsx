"use client";

import { signOut } from "next-auth/react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const t = useI18n();

  return (
    <Button variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
      {t("shell.signOut")}
    </Button>
  );
}

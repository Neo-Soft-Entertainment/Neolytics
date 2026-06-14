"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function UserLanguagePanel({
  currentLanguage,
  languageOptions
}: {
  currentLanguage: string;
  languageOptions: Array<{
    value: string;
    label: string;
  }>;
}) {
  const router = useRouter();
  const t = useI18n();
  const [preferredLanguage, setPreferredLanguage] = useState(currentLanguage);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function saveLanguage() {
    setIsSaving(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/users/preferences", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        preferredLanguage
      })
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    setIsSaving(false);

    if (!response.ok) {
      setError(payload?.message ?? t("settings.languageUpdateError"));
      return;
    }

    setMessage(t("settings.languageUpdated"));
    router.refresh();
  }

    let resolvedValue0: any;
  if (message) {
    resolvedValue0 = <p className="text-sm text-emerald-600">{message}</p>;
  } else {
    resolvedValue0 = null;
  }
  let resolvedValue1: any;
  if (error) {
    resolvedValue1 = <p className="text-sm text-destructive">{error}</p>;
  } else {
    resolvedValue1 = null;
  }
  let resolvedValue2: any;
  if (isSaving) {
    resolvedValue2 = t("settings.savingLanguage");
  } else {
    resolvedValue2 = t("settings.saveLanguage");
  }
return (
    <Card className="overflow-hidden">
      <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
      <CardHeader>
        <CardTitle>{t("settings.languagePreference")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="preferred-language">{t("settings.accountLanguage")}</Label>
          <select
            id="preferred-language"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={preferredLanguage}
            onChange={(event: any) => setPreferredLanguage(event.target.value)}
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted-foreground">
            {t("settings.languageHelp")}
          </p>
        </div>
        {resolvedValue0}
        {resolvedValue1}
        <Button disabled={isSaving} type="button" onClick={saveLanguage}>
          {resolvedValue2}
        </Button>
      </CardContent>
    </Card>
  );
}

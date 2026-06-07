"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      setError(payload?.message ?? "Unable to update language.");
      return;
    }

    setMessage("Language preference updated.");
    router.refresh();
  }

  return (
    <Card className="overflow-hidden">
      <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
      <CardHeader>
        <CardTitle>Language preference</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="preferred-language">Account language</Label>
          <select
            id="preferred-language"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={preferredLanguage}
            onChange={(event) => setPreferredLanguage(event.target.value)}
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted-foreground">
            This saves your preferred account language. It is separate from the organization default language used in company operations.
          </p>
        </div>
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button disabled={isSaving} type="button" onClick={saveLanguage}>
          {isSaving ? "Saving..." : "Save language"}
        </Button>
      </CardContent>
    </Card>
  );
}

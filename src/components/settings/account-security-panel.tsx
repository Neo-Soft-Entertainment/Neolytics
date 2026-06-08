"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountSecurityPanel() {
  const t = useI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function updatePassword() {
    setMessage(null);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    const response = await fetch("/api/users/password", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    setIsSaving(false);

    if (!response.ok) {
      setError(payload?.message ?? t("account.passwordUpdateError"));
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage(t("account.passwordUpdated"));
  }

  async function deleteAccount() {
    const confirmed = window.confirm(t("account.deleteAccountConfirm"));

    if (!confirmed) {
      return;
    }

    setMessage(null);
    setError(null);
    setIsDeleting(true);

    const response = await fetch("/api/users/account", {
      method: "DELETE"
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setIsDeleting(false);
      setError(payload?.message ?? t("account.deleteAccountError"));
      return;
    }

    await signOut({
      callbackUrl: "/login"
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
      <CardHeader>
        <CardTitle>{t("account.security")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="current-password">{t("account.currentPassword")}</Label>
              <Input
                id="current-password"
                autoComplete="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">{t("account.newPassword")}</Label>
              <Input
                id="new-password"
                autoComplete="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t("account.confirmPassword")}</Label>
              <Input
                id="confirm-password"
                autoComplete="new-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </div>
          <Button disabled={isSaving || newPassword.length < 8} type="button" onClick={updatePassword}>
            {isSaving ? t("settings.savingLanguage") : t("account.changePassword")}
          </Button>
        </div>

        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">{t("account.deleteAccount")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("account.deleteAccountCopy")}</p>
          <Button className="mt-4" disabled={isDeleting} type="button" variant="destructive" onClick={deleteAccount}>
            {isDeleting ? t("account.deletingAccount") : t("account.deleteAccount")}
          </Button>
        </div>

        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

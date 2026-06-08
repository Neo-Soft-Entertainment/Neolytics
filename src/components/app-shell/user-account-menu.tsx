"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRef, useState } from "react";
import { ChevronDown, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/components/i18n-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "N";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function AvatarPreview({
  image,
  name,
  email,
  className
}: {
  image?: string | null;
  name?: string | null;
  email?: string | null;
  className?: string;
}) {
  if (image) {
    return (
      <img
        alt={name || email || "User avatar"}
        className={cn("h-10 w-10 rounded-full border border-white/10 object-cover", className)}
        src={image}
      />
    );
  }

  return (
    <div className={cn("flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-cyan-500/15 text-sm font-semibold text-cyan-100", className)}>
      {getInitials(name, email)}
    </div>
  );
}

export function UserAccountMenu({
  name,
  email,
  image,
  preferredLanguage,
  languageOptions
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  preferredLanguage: string;
  languageOptions: Array<{
    value: string;
    label: string;
  }>;
}) {
  const router = useRouter();
  const t = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState(preferredLanguage);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveLanguage() {
    setIsSavingLanguage(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/users/preferences", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        preferredLanguage: selectedLanguage
      })
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    setIsSavingLanguage(false);

    if (!response.ok) {
      setError(payload?.message ?? t("settings.languageUpdateError"));
      return;
    }

    setMessage(t("settings.languageUpdated"));
    router.refresh();
  }

  async function uploadAvatar(file: File) {
    setIsUploadingAvatar(true);
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("avatar", file);

    const response = await fetch("/api/users/avatar", {
      method: "POST",
      body: formData
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    setIsUploadingAvatar(false);

    if (!response.ok) {
      setError(payload?.message ?? t("account.avatarUploadError"));
      return;
    }

    setMessage(t("account.avatarUploaded"));
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/55 px-2 py-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:bg-white/70 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
          type="button"
        >
          <AvatarPreview className="h-9 w-9" email={email} image={image} name={name} />
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] rounded-[1.5rem] border-white/10 bg-background/95 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl" sideOffset={10}>
        <div className="flex items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/45 p-3 dark:bg-white/[0.03]">
          <AvatarPreview email={email} image={image} name={name} />
          <div className="min-w-0">
            <p className="truncate font-medium">{name || t("account.account")}</p>
            <p className="truncate text-sm text-muted-foreground">{email || t("common.na")}</p>
          </div>
        </div>

        <div className="mt-3 space-y-3 rounded-[1.25rem] border border-white/10 bg-white/35 p-3 dark:bg-white/[0.02]">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground">{t("account.avatar")}</p>
            <input
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (!file) {
                  return;
                }

                void uploadAvatar(file);
                event.target.value = "";
              }}
              ref={fileInputRef}
              type="file"
            />
            <Button className="w-full justify-center" disabled={isUploadingAvatar} onClick={() => fileInputRef.current?.click()} type="button" variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              {isUploadingAvatar ? t("account.uploadingAvatar") : t("account.uploadAvatar")}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground" htmlFor="account-language">
              {t("settings.accountLanguage")}
            </label>
            <select
              className="flex h-10 w-full rounded-xl border border-white/10 bg-background/75 px-3 py-2 text-sm"
              id="account-language"
              onChange={(event) => setSelectedLanguage(event.target.value)}
              value={selectedLanguage}
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button className="w-full" disabled={isSavingLanguage} onClick={saveLanguage} type="button">
              {isSavingLanguage ? t("settings.savingLanguage") : t("settings.saveLanguage")}
            </Button>
          </div>

          {message ? <p className="text-sm text-emerald-500">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings">{t("account.openSettings")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
          {t("shell.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import Link from "next/link";
import Script from "next/script";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

declare global {
  interface Window {
    grecaptcha?: {
      ready(callback: () => void): void;
      execute(siteKey: string, options: { action: string }): Promise<string>;
    };
  }
}

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const recaptchaAction = "login";

type FormValues = z.infer<typeof schema>;

export function LoginForm({
  inviteToken,
  hasGoogleLogin,
  hasDiscordLogin,
  hasAppleLogin,
  recaptchaSiteKey
}: {
  inviteToken?: string;
  hasGoogleLogin: boolean;
  hasDiscordLogin: boolean;
  hasAppleLogin: boolean;
  recaptchaSiteKey?: string;
}) {
  const t = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [isSocialLoading, setIsSocialLoading] = useState<"google" | "discord" | "apple" | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const hasSocialLogin = hasGoogleLogin || hasDiscordLogin || hasAppleLogin;

  async function checkAuthAvailability() {
    const response = await fetch("/api/auth/status", {
      method: "GET",
      cache: "no-store"
    });

    if (response.ok) {
      return true;
    }

    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    setError(payload?.message ?? t("auth.authUnavailable"));
    return false;
  }

  async function getRecaptchaToken() {
    if (!recaptchaSiteKey) {
      return undefined;
    }

    if (!window.grecaptcha) {
      return null;
    }

    return new Promise<string | null>((resolve) => {
      window.grecaptcha?.ready(() => {
        window.grecaptcha
          ?.execute(recaptchaSiteKey, { action: recaptchaAction })
          .then(resolve)
          .catch(() => resolve(null));
      });
    });
  }

  async function onSubmit(values: FormValues) {
    setError(null);
    const callbackUrl = inviteToken ? `/invite/${inviteToken}` : "/dashboard";

    try {
      const isAvailable = await checkAuthAvailability();

      if (!isAvailable) {
        return;
      }

      const recaptchaToken = await getRecaptchaToken();

      if (recaptchaToken === null) {
        setError(t("auth.recaptchaFailed"));
        return;
      }

      const result = await signIn("credentials", {
        email: values.email.trim().toLowerCase(),
        password: values.password,
        recaptchaToken,
        redirect: false,
        callbackUrl
      });

      if (!result) {
        setError(t("auth.authUnavailable"));
        return;
      }

      if (result.error) {
        if (result.code === "rate_limited") {
          setError(t("auth.tooManyAttempts"));
          return;
        }

        if (result.code === "recaptcha_failed") {
          setError(t("auth.recaptchaFailed"));
          return;
        }

        setError(result.error === "CredentialsSignin" ? t("auth.invalidCredentials") : t("auth.authFailed"));
        return;
      }

      if (!result.ok || !result.url) {
        setError(t("auth.redirectFailed"));
        return;
      }

      window.location.assign(result.url);
      return;
    } catch {
      setError(t("auth.authUnavailable"));
    }
  }

  async function onGoogleSignIn() {
    setError(null);
    const isAvailable = await checkAuthAvailability();

    if (!isAvailable) {
      return;
    }

    setIsSocialLoading("google");
    await signIn("google", {
      callbackUrl: inviteToken ? `/invite/${inviteToken}` : "/dashboard"
    });
    setIsSocialLoading(null);
  }

  async function onDiscordSignIn() {
    setError(null);
    const isAvailable = await checkAuthAvailability();

    if (!isAvailable) {
      return;
    }

    setIsSocialLoading("discord");
    await signIn("discord", {
      callbackUrl: inviteToken ? `/invite/${inviteToken}` : "/dashboard"
    });
    setIsSocialLoading(null);
  }

  async function onAppleSignIn() {
    setError(null);
    const isAvailable = await checkAuthAvailability();

    if (!isAvailable) {
      return;
    }

    setIsSocialLoading("apple");
    await signIn("apple", {
      callbackUrl: inviteToken ? `/invite/${inviteToken}` : "/dashboard"
    });
    setIsSocialLoading(null);
  }

  return (
    <>
      {recaptchaSiteKey ? (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(recaptchaSiteKey)}`}
          strategy="afterInteractive"
        />
      ) : null}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("auth.signInTitle")}</CardTitle>
          <CardDescription>
            {t("auth.signInDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasSocialLogin ? (
            <div className="mb-4 space-y-3">
              {hasGoogleLogin ? (
                <Button
                  className="w-full"
                  disabled={form.formState.isSubmitting || isSocialLoading !== null}
                  type="button"
                  variant="outline"
                  onClick={onGoogleSignIn}
                >
                  {isSocialLoading === "google" ? t("auth.redirectGoogle") : t("auth.continueGoogle")}
                </Button>
              ) : null}
              {hasDiscordLogin ? (
                <Button
                  className="w-full"
                  disabled={form.formState.isSubmitting || isSocialLoading !== null}
                  type="button"
                  variant="outline"
                  onClick={onDiscordSignIn}
                >
                  {isSocialLoading === "discord" ? t("auth.redirectDiscord") : t("auth.continueDiscord")}
                </Button>
              ) : null}
              {hasAppleLogin ? (
                <Button
                  className="w-full"
                  disabled={form.formState.isSubmitting || isSocialLoading !== null}
                  type="button"
                  variant="outline"
                  onClick={onAppleSignIn}
                >
                  {isSocialLoading === "apple" ? t("auth.redirectApple") : t("auth.continueApple")}
                </Button>
              ) : null}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t("auth.orUseEmail")}</span>
                </div>
              </div>
            </div>
          ) : null}
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email ? (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
              />
              {form.formState.errors.password ? (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" disabled={form.formState.isSubmitting || isSocialLoading !== null} type="submit">
              {form.formState.isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
            </Button>
            {inviteToken ? (
              <p className="text-center text-sm text-muted-foreground">
                {t("auth.inviteHint")}
              </p>
            ) : null}
            <p className="text-center text-sm text-muted-foreground">
              {t("auth.newHere")}{" "}
              <Link
                className="underline underline-offset-4"
                href={inviteToken ? `/signup?inviteToken=${inviteToken}` : "/signup"}
              >
                {t("auth.createAccount")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

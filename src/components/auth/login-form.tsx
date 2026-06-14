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
        let resolvedValue0: any;
    if (inviteToken) {
      resolvedValue0 = `/invite/${inviteToken}`;
    } else {
      resolvedValue0 = "/dashboard";
    }
const callbackUrl = resolvedValue0;

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

                let resolvedValue1: any;
        if (result.error === "CredentialsSignin") {
          resolvedValue1 = t("auth.invalidCredentials");
        } else {
          resolvedValue1 = t("auth.authFailed");
        }
setError(resolvedValue1);
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
        let resolvedValue2: any;
    if (inviteToken) {
      resolvedValue2 = `/invite/${inviteToken}`;
    } else {
      resolvedValue2 = "/dashboard";
    }
await signIn("google", {
      callbackUrl: resolvedValue2
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
        let resolvedValue3: any;
    if (inviteToken) {
      resolvedValue3 = `/invite/${inviteToken}`;
    } else {
      resolvedValue3 = "/dashboard";
    }
await signIn("discord", {
      callbackUrl: resolvedValue3
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
        let resolvedValue4: any;
    if (inviteToken) {
      resolvedValue4 = `/invite/${inviteToken}`;
    } else {
      resolvedValue4 = "/dashboard";
    }
await signIn("apple", {
      callbackUrl: resolvedValue4
    });
    setIsSocialLoading(null);
  }

    let resolvedValue5: any;
  if (recaptchaSiteKey) {
    resolvedValue5 = (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(recaptchaSiteKey)}`}
          strategy="afterInteractive"
        />
      );
  } else {
    resolvedValue5 = null;
  }
  let resolvedValue6: any;
  if (hasSocialLogin) {
        let resolvedValue13: any;
    if (hasGoogleLogin) {
            let resolvedValue16: any;
      if (isSocialLoading === "google") {
        resolvedValue16 = t("auth.redirectGoogle");
      } else {
        resolvedValue16 = t("auth.continueGoogle");
      }
resolvedValue13 = (
                <Button
                  className="w-full"
                  disabled={form.formState.isSubmitting || isSocialLoading !== null}
                  type="button"
                  variant="outline"
                  onClick={onGoogleSignIn}
                >
                  {resolvedValue16}
                </Button>
              );
    } else {
      resolvedValue13 = null;
    }
    let resolvedValue14: any;
    if (hasDiscordLogin) {
            let resolvedValue17: any;
      if (isSocialLoading === "discord") {
        resolvedValue17 = t("auth.redirectDiscord");
      } else {
        resolvedValue17 = t("auth.continueDiscord");
      }
resolvedValue14 = (
                <Button
                  className="w-full"
                  disabled={form.formState.isSubmitting || isSocialLoading !== null}
                  type="button"
                  variant="outline"
                  onClick={onDiscordSignIn}
                >
                  {resolvedValue17}
                </Button>
              );
    } else {
      resolvedValue14 = null;
    }
    let resolvedValue15: any;
    if (hasAppleLogin) {
            let resolvedValue18: any;
      if (isSocialLoading === "apple") {
        resolvedValue18 = t("auth.redirectApple");
      } else {
        resolvedValue18 = t("auth.continueApple");
      }
resolvedValue15 = (
                <Button
                  className="w-full"
                  disabled={form.formState.isSubmitting || isSocialLoading !== null}
                  type="button"
                  variant="outline"
                  onClick={onAppleSignIn}
                >
                  {resolvedValue18}
                </Button>
              );
    } else {
      resolvedValue15 = null;
    }
resolvedValue6 = (
            <div className="space-y-2.5">
              {resolvedValue13}
              {resolvedValue14}
              {resolvedValue15}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t("auth.orUseEmail")}</span>
                </div>
              </div>
            </div>
          );
  } else {
    resolvedValue6 = null;
  }
  let resolvedValue7: any;
  if (form.formState.errors.email) {
    resolvedValue7 = (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              );
  } else {
    resolvedValue7 = null;
  }
  let resolvedValue8: any;
  if (form.formState.errors.password) {
    resolvedValue8 = (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              );
  } else {
    resolvedValue8 = null;
  }
  let resolvedValue9: any;
  if (error) {
    resolvedValue9 = <p className="text-sm text-destructive">{error}</p>;
  } else {
    resolvedValue9 = null;
  }
  let resolvedValue10: any;
  if (form.formState.isSubmitting) {
    resolvedValue10 = t("auth.signingIn");
  } else {
    resolvedValue10 = t("auth.signIn");
  }
  let resolvedValue11: any;
  if (inviteToken) {
    resolvedValue11 = (
              <p className="text-center text-xs text-muted-foreground">
                {t("auth.inviteHint")}
              </p>
            );
  } else {
    resolvedValue11 = null;
  }
  let resolvedValue12: any;
  if (inviteToken) {
    resolvedValue12 = `/signup?inviteToken=${inviteToken}`;
  } else {
    resolvedValue12 = "/signup";
  }
return (
    <>
      {resolvedValue5}
      <Card className="w-full max-w-sm border-white/10 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle>{t("auth.signInTitle")}</CardTitle>
          <CardDescription>{t("auth.signInDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {resolvedValue6}
          <form className="space-y-3.5" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
              {resolvedValue7}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
              />
              {resolvedValue8}
            </div>
            {resolvedValue9}
            <Button className="w-full" disabled={form.formState.isSubmitting || isSocialLoading !== null} type="submit">
              {resolvedValue10}
            </Button>
            {resolvedValue11}
            <p className="text-center text-sm text-muted-foreground">
              {t("auth.newHere")}{" "}
              <Link
                className="underline underline-offset-4"
                href={resolvedValue12}
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

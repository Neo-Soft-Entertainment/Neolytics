"use client";

import { SubscriptionPlan } from "@prisma/client";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { subscriptionPlans, subscriptionTruthNotes } from "@/lib/subscription-plans";

type FormValues = {
  name: string;
  email: string;
  password: string;
  organizationName?: string;
  workspaceName?: string;
  plan?: SubscriptionPlan;
};

export function SignupForm({
  inviteToken,
  hasGoogleLogin,
  hasDiscordLogin,
  hasAppleLogin,
  invitedOrganizationName,
  invitedEmail
}: {
  inviteToken?: string;
  hasGoogleLogin: boolean;
  hasDiscordLogin: boolean;
  hasAppleLogin: boolean;
  invitedOrganizationName?: string;
  invitedEmail?: string;
}) {
  const router = useRouter();
  const t = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [isSocialLoading, setIsSocialLoading] = useState<"google" | "discord" | "apple" | null>(null);
    let resolvedValue0: any;
  if (inviteToken) {
    resolvedValue0 = z.string().optional();
  } else {
    resolvedValue0 = z.string().min(2);
  }
  let resolvedValue1: any;
  if (inviteToken) {
    resolvedValue1 = z.string().optional();
  } else {
    resolvedValue1 = z.string().min(2);
  }
  let resolvedValue2: any;
  if (inviteToken) {
    resolvedValue2 = z.nativeEnum(SubscriptionPlan).optional();
  } else {
    resolvedValue2 = z.nativeEnum(SubscriptionPlan);
  }
const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    organizationName: resolvedValue0,
    workspaceName: resolvedValue1,
    plan: resolvedValue2
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: invitedEmail ?? "",
      password: "",
      organizationName: "",
      workspaceName: "Área de trabalho padrão",
      plan: SubscriptionPlan.FREE
    }
  });
  const selectedPlan = form.watch("plan") ?? SubscriptionPlan.FREE;

  async function onGoogleSignIn() {
    setError(null);
    setIsSocialLoading("google");
        let resolvedValue3: any;
    if (inviteToken) {
      resolvedValue3 = `/invite/${inviteToken}`;
    } else {
      resolvedValue3 = "/setup";
    }
await signIn("google", {
      callbackUrl: resolvedValue3
    });
    setIsSocialLoading(null);
  }

  async function onDiscordSignIn() {
    setError(null);
    setIsSocialLoading("discord");
        let resolvedValue4: any;
    if (inviteToken) {
      resolvedValue4 = `/invite/${inviteToken}`;
    } else {
      resolvedValue4 = "/setup";
    }
await signIn("discord", {
      callbackUrl: resolvedValue4
    });
    setIsSocialLoading(null);
  }

  async function onAppleSignIn() {
    setError(null);
    setIsSocialLoading("apple");
        let resolvedValue5: any;
    if (inviteToken) {
      resolvedValue5 = `/invite/${inviteToken}`;
    } else {
      resolvedValue5 = "/setup";
    }
await signIn("apple", {
      callbackUrl: resolvedValue5
    });
    setIsSocialLoading(null);
  }

  async function onSubmit(values: FormValues) {
    setError(null);

        let resolvedValue6: any;
    if (inviteToken) {
      resolvedValue6 = {
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        inviteToken
      };
    } else {
      resolvedValue6 = {
        ...values,
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        organizationName: values.organizationName?.trim(),
        workspaceName: values.workspaceName?.trim(),
        inviteToken
      };
    }
const response = await fetch("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(resolvedValue6)
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? "Não foi possível criar a conta.");
      return;
    }

    const signupPayload = (await response.json().catch(() => null)) as { requiresCheckout?: boolean } | null;
    const result = await signIn("credentials", {
      email: values.email.trim().toLowerCase(),
      password: values.password,
      redirect: false
    });

    if (result?.error) {
      router.push("/login");
      router.refresh();
      return;
    }

    if (!inviteToken && signupPayload?.requiresCheckout && values.plan && values.plan !== SubscriptionPlan.FREE) {
      const checkoutResponse = await fetch("/api/organizations/subscription/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ plan: values.plan })
      });
      const checkoutPayload = (await checkoutResponse.json().catch(() => null)) as { url?: string; message?: string } | null;

      if (checkoutResponse.ok && checkoutPayload?.url) {
        window.location.assign(checkoutPayload.url);
        return;
      }

      router.push("/settings");
      router.refresh();
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

    let resolvedValue7: any;
  if (inviteToken) {
    resolvedValue7 = t("auth.joinOrganization");
  } else {
    resolvedValue7 = t("auth.createWorkspace");
  }
  let resolvedValue8: any;
  if (inviteToken) {
    resolvedValue8 = `Crie sua conta e entre em ${invitedOrganizationName ?? "esta organização"}.`;
  } else {
    resolvedValue8 = t("auth.signupDescription");
  }
  let resolvedValue9: any;
  if (hasGoogleLogin || hasDiscordLogin || hasAppleLogin) {
        let resolvedValue17: any;
    if (hasGoogleLogin) {
            let resolvedValue28: any;
      if (isSocialLoading === "google") {
        resolvedValue28 = t("auth.redirectGoogle");
      } else {
        resolvedValue28 = t("auth.continueGoogle");
      }
resolvedValue17 = (
              <Button
                className="w-full"
                disabled={form.formState.isSubmitting || isSocialLoading !== null}
                type="button"
                variant="outline"
                onClick={onGoogleSignIn}
              >
                {resolvedValue28}
              </Button>
            );
    } else {
      resolvedValue17 = null;
    }
    let resolvedValue18: any;
    if (hasDiscordLogin) {
            let resolvedValue29: any;
      if (isSocialLoading === "discord") {
        resolvedValue29 = t("auth.redirectDiscord");
      } else {
        resolvedValue29 = t("auth.continueDiscord");
      }
resolvedValue18 = (
              <Button
                className="w-full"
                disabled={form.formState.isSubmitting || isSocialLoading !== null}
                type="button"
                variant="outline"
                onClick={onDiscordSignIn}
              >
                {resolvedValue29}
              </Button>
            );
    } else {
      resolvedValue18 = null;
    }
    let resolvedValue19: any;
    if (hasAppleLogin) {
            let resolvedValue30: any;
      if (isSocialLoading === "apple") {
        resolvedValue30 = t("auth.redirectApple");
      } else {
        resolvedValue30 = t("auth.continueApple");
      }
resolvedValue19 = (
              <Button
                className="w-full"
                disabled={form.formState.isSubmitting || isSocialLoading !== null}
                type="button"
                variant="outline"
                onClick={onAppleSignIn}
              >
                {resolvedValue30}
              </Button>
            );
    } else {
      resolvedValue19 = null;
    }
    let resolvedValue20: any;
    if (!inviteToken) {
      resolvedValue20 = (
              <p className="text-xs text-muted-foreground">
                {t("auth.socialSignupHint")}
              </p>
            );
    } else {
      resolvedValue20 = null;
    }
resolvedValue9 = (
          <div className="space-y-2.5">
            {resolvedValue17}
            {resolvedValue18}
            {resolvedValue19}
            {resolvedValue20}
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
    resolvedValue9 = null;
  }
  let resolvedValue10: any;
  if (form.formState.errors.name) {
    resolvedValue10 = (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            );
  } else {
    resolvedValue10 = null;
  }
  let resolvedValue11: any;
  if (form.formState.errors.email) {
    resolvedValue11 = (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            );
  } else {
    resolvedValue11 = null;
  }
  let resolvedValue12: any;
  if (form.formState.errors.password) {
    resolvedValue12 = (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            );
  } else {
    resolvedValue12 = null;
  }
  let resolvedValue13: any;
  if (inviteToken) {
        let resolvedValue21: any;
    if (invitedEmail) {
      resolvedValue21 = (
                <>
                  {" "}
                  com
                  {" "}
                  <span className="font-medium text-foreground">{invitedEmail}</span>.
                </>
              );
    } else {
      resolvedValue21 = null;
    }
resolvedValue13 = (
            <div className="rounded-2xl border bg-muted/30 p-3 text-sm text-muted-foreground md:col-span-2">
              Entrando em
              {" "}
              <span className="font-medium text-foreground">{invitedOrganizationName ?? "esta organização"}</span>
              {resolvedValue21}
            </div>
          );
  } else {
        let resolvedValue22: any;
    if (form.formState.errors.organizationName) {
      resolvedValue22 = (
                  <p className="text-sm text-destructive">{form.formState.errors.organizationName.message}</p>
                );
    } else {
      resolvedValue22 = null;
    }
    let resolvedValue23: any;
    if (form.formState.errors.workspaceName) {
      resolvedValue23 = (
                  <p className="text-sm text-destructive">{form.formState.errors.workspaceName.message}</p>
                );
    } else {
      resolvedValue23 = null;
    }
    let resolvedValue26: any;
    if (form.formState.errors.plan) {
      resolvedValue26 = (
                  <p className="text-sm text-destructive">{form.formState.errors.plan.message}</p>
                );
    } else {
      resolvedValue26 = null;
    }
resolvedValue13 = (
            <>
              <div className="space-y-2">
                <Label htmlFor="organizationName">{t("auth.organization")}</Label>
                <Input id="organizationName" placeholder="Northstar Studio" {...form.register("organizationName")} />
                {resolvedValue22}
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspaceName">{t("auth.firstWorkspace")}</Label>
                <Input id="workspaceName" placeholder="Portfólio principal" {...form.register("workspaceName")} />
                {resolvedValue23}
              </div>
              <div className="space-y-3 md:col-span-2">
                <Label>{t("auth.plan")}</Label>
                <div className="grid gap-3 md:grid-cols-3">
                  {Object.entries(subscriptionPlans).map(([planKey, plan]) => {
                    const planId = planKey as SubscriptionPlan;
                    const isSelected = selectedPlan === planId;

                                        let resolvedValue24: any;
                    if (isSelected) {
                      resolvedValue24 = "border-primary bg-primary/5";
                    } else {
                      resolvedValue24 = "hover:border-foreground/30";
                    }
                    let resolvedValue25: any;
                    if (planId === SubscriptionPlan.FREE) {
                      resolvedValue25 = "Começa imediatamente.";
                    } else {
                      resolvedValue25 = "Começa com 7 dias de teste gratuito no Stripe Checkout.";
                    }
return (
                      <button
                        key={planId}
                        className={`rounded-2xl border p-3 text-left transition ${
                          resolvedValue24
                        }`}
                        onClick={() => form.setValue("plan", planId, { shouldValidate: true })}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{plan.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                          </div>
                          <p className="text-sm font-semibold">{plan.priceLabel}</p>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {resolvedValue25}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <details className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-foreground">{t("auth.officialScope")}</summary>
                  <div className="mt-3 space-y-2">
                    {subscriptionTruthNotes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                </details>
                {resolvedValue26}
              </div>
            </>
          );
  }
  let resolvedValue14: any;
  if (error) {
    resolvedValue14 = <p className="text-sm text-destructive md:col-span-2">{error}</p>;
  } else {
    resolvedValue14 = null;
  }
  let resolvedValue15: any;
  if (inviteToken) {
    resolvedValue15 = `/login?inviteToken=${inviteToken}`;
  } else {
    resolvedValue15 = "/login";
  }
  let resolvedValue16: any;
  if (form.formState.isSubmitting) {
    resolvedValue16 = t("auth.creating");
  } else {
        let resolvedValue27: any;
    if (inviteToken) {
      resolvedValue27 = t("auth.createAndJoin");
    } else {
      resolvedValue27 = t("auth.createAccountAction");
    }
resolvedValue16 = resolvedValue27;
  }
return (
    <Card className="w-full max-w-lg border-white/10 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle>{resolvedValue7}</CardTitle>
        <CardDescription>
          {resolvedValue8}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {resolvedValue9}
        <form className="grid gap-3.5 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">{t("auth.yourName")}</Label>
            <Input id="name" autoComplete="name" {...form.register("name")} />
            {resolvedValue10}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              readOnly={Boolean(inviteToken && invitedEmail)}
              {...form.register("email")}
            />
            {resolvedValue11}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
            {resolvedValue12}
          </div>
          {resolvedValue13}
          {resolvedValue14}
          <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              {t("auth.alreadyHaveAccount")}{" "}
              <Link
                className="underline underline-offset-4"
                href={resolvedValue15}
              >
                {t("auth.signIn")}
              </Link>
            </p>
            <Button disabled={form.formState.isSubmitting || isSocialLoading !== null} type="submit">
              {resolvedValue16}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

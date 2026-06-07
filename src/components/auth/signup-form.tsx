"use client";

import { SubscriptionPlan } from "@prisma/client";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { subscriptionPlans } from "@/lib/subscription-plans";

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
  invitedOrganizationName,
  invitedEmail
}: {
  inviteToken?: string;
  hasGoogleLogin: boolean;
  invitedOrganizationName?: string;
  invitedEmail?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    organizationName: inviteToken ? z.string().optional() : z.string().min(2),
    workspaceName: inviteToken ? z.string().optional() : z.string().min(2),
    plan: inviteToken ? z.nativeEnum(SubscriptionPlan).optional() : z.nativeEnum(SubscriptionPlan)
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: invitedEmail ?? "",
      password: "",
      organizationName: "",
      workspaceName: "Default Workspace",
      plan: SubscriptionPlan.FREE
    }
  });
  const selectedPlan = form.watch("plan") ?? SubscriptionPlan.FREE;

  async function onGoogleSignIn() {
    setError(null);
    setIsGoogleLoading(true);
    await signIn("google", {
      callbackUrl: inviteToken ? `/invite/${inviteToken}` : "/setup"
    });
    setIsGoogleLoading(false);
  }

  async function onSubmit(values: FormValues) {
    setError(null);

    const response = await fetch("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(inviteToken ? {
        name: values.name,
        email: values.email,
        password: values.password,
        inviteToken
      } : {
        ...values,
        inviteToken
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? "Unable to create account.");
      return;
    }

    const signupPayload = (await response.json().catch(() => null)) as { requiresCheckout?: boolean } | null;
    const result = await signIn("credentials", {
      email: values.email,
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

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>{inviteToken ? "Join organization" : "Create your workspace"}</CardTitle>
        <CardDescription>
          {inviteToken
            ? `Create your account and join ${invitedOrganizationName ?? "this organization"} in one step.`
            : "Create the account, launch the first organization, and activate the plan you want right after signup."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasGoogleLogin ? (
          <div className="mb-4 space-y-3">
            <Button
              className="w-full"
              disabled={form.formState.isSubmitting || isGoogleLoading}
              type="button"
              variant="outline"
              onClick={onGoogleSignIn}
            >
              {isGoogleLoading ? "Redirecting to Google..." : "Continue with Google"}
            </Button>
            {!inviteToken ? (
              <p className="text-sm text-muted-foreground">
                Google signup continues into setup, where you can create the organization and manage billing.
              </p>
            ) : null}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or use email</span>
              </div>
            </div>
          </div>
        ) : null}
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" autoComplete="name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              readOnly={Boolean(inviteToken && invitedEmail)}
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            ) : null}
          </div>
          {inviteToken ? (
            <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground md:col-span-2">
              You are joining
              {" "}
              <span className="font-medium text-foreground">{invitedOrganizationName ?? "this organization"}</span>
              {invitedEmail ? (
                <>
                  {" "}
                  with
                  {" "}
                  <span className="font-medium text-foreground">{invitedEmail}</span>.
                </>
              ) : null}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization</Label>
                <Input id="organizationName" placeholder="Northstar Studio" {...form.register("organizationName")} />
                {form.formState.errors.organizationName ? (
                  <p className="text-sm text-destructive">{form.formState.errors.organizationName.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspaceName">First workspace</Label>
                <Input id="workspaceName" placeholder="Core Portfolio" {...form.register("workspaceName")} />
                {form.formState.errors.workspaceName ? (
                  <p className="text-sm text-destructive">{form.formState.errors.workspaceName.message}</p>
                ) : null}
              </div>
              <div className="space-y-3 md:col-span-2">
                <Label>Plan</Label>
                <div className="grid gap-3 md:grid-cols-3">
                  {Object.entries(subscriptionPlans).map(([planKey, plan]) => {
                    const planId = planKey as SubscriptionPlan;
                    const isSelected = selectedPlan === planId;

                    return (
                      <button
                        key={planId}
                        className={`rounded-2xl border p-4 text-left transition ${
                          isSelected ? "border-primary bg-primary/5" : "hover:border-foreground/30"
                        }`}
                        onClick={() => form.setValue("plan", planId, { shouldValidate: true })}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{plan.label}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                          </div>
                          <p className="text-sm font-semibold">{plan.priceLabel}</p>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {planId === SubscriptionPlan.FREE ? "Starts immediately." : "Activated after Stripe checkout."}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {form.formState.errors.plan ? (
                  <p className="text-sm text-destructive">{form.formState.errors.plan.message}</p>
                ) : null}
              </div>
            </>
          )}
          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="flex items-center justify-between gap-3 md:col-span-2">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                className="underline underline-offset-4"
                href={inviteToken ? `/login?inviteToken=${inviteToken}` : "/login"}
              >
                Sign in
              </Link>
            </p>
            <Button disabled={form.formState.isSubmitting || isGoogleLoading} type="submit">
              {form.formState.isSubmitting ? "Creating..." : inviteToken ? "Create account and join" : "Create account"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

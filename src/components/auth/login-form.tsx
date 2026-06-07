"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type FormValues = z.infer<typeof schema>;

export function LoginForm({
  inviteToken,
  hasGoogleLogin,
  hasDiscordLogin,
  hasAppleLogin
}: {
  inviteToken?: string;
  hasGoogleLogin: boolean;
  hasDiscordLogin: boolean;
  hasAppleLogin: boolean;
}) {
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
    setError(payload?.message ?? "Authentication servers are temporarily unavailable. Try again later.");
    return false;
  }

  async function onSubmit(values: FormValues) {
    setError(null);
    const callbackUrl = inviteToken ? `/invite/${inviteToken}` : "/dashboard";

    try {
      const isAvailable = await checkAuthAvailability();

      if (!isAvailable) {
        return;
      }

      const result = await signIn("credentials", {
        email: values.email.trim().toLowerCase(),
        password: values.password,
        redirect: false,
        callbackUrl
      });

      if (!result) {
        setError("We could not reach the authentication service. Try again.");
        return;
      }

      if (result.error) {
        setError(result.error === "CredentialsSignin" ? "Invalid email or password." : "Authentication failed. Try again later.");
        return;
      }

      if (!result.ok || !result.url) {
        setError("The sign-in completed, but we could not finish the redirect. Try again.");
        return;
      }

      window.location.assign(result.url);
      return;
    } catch {
      setError("Authentication servers are temporarily unavailable. Try again later.");
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
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Access your workspace, Steam intelligence, project operating system, finance layer, and company backbone.
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
                {isSocialLoading === "google" ? "Redirecting to Google..." : "Continue with Google"}
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
                {isSocialLoading === "discord" ? "Redirecting to Discord..." : "Continue with Discord"}
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
                {isSocialLoading === "apple" ? "Redirecting to Apple..." : "Continue with Apple"}
              </Button>
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
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email ? (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
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
            {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
          {inviteToken ? (
            <p className="text-center text-sm text-muted-foreground">
              Sign in to accept your organization invitation.
            </p>
          ) : null}
          <p className="text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link
              className="underline underline-offset-4"
              href={inviteToken ? `/signup?inviteToken=${inviteToken}` : "/signup"}
            >
              Create your account
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

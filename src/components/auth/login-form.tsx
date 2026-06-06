"use client";

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

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type FormValues = z.infer<typeof schema>;

export function LoginForm({
  inviteToken,
  hasGoogleLogin,
  hasDiscordLogin
}: {
  inviteToken?: string;
  hasGoogleLogin: boolean;
  hasDiscordLogin: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const hasSocialLogin = hasGoogleLogin || hasDiscordLogin;

  async function onSubmit(values: FormValues) {
    setError(null);

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false
    });

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(inviteToken ? `/invite/${inviteToken}` : "/dashboard");
    router.refresh();
  }

  async function onGoogleSignIn() {
    setError(null);
    await signIn("google", {
      callbackUrl: inviteToken ? `/invite/${inviteToken}` : "/dashboard"
    });
  }

  async function onDiscordSignIn() {
    setError(null);
    await signIn("discord", {
      callbackUrl: inviteToken ? `/invite/${inviteToken}` : "/dashboard"
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Access your workspace, Steam market intelligence, automated GDDs, and project execution boards.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasSocialLogin ? (
          <div className="mb-4 space-y-3">
            {hasGoogleLogin ? (
              <Button className="w-full" type="button" variant="outline" onClick={onGoogleSignIn}>
                Continue with Google
              </Button>
            ) : null}
            {hasDiscordLogin ? (
              <Button className="w-full" type="button" variant="outline" onClick={onDiscordSignIn}>
                Continue with Discord
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
          <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
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

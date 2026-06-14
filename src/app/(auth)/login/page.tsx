import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NeolyticsBrand } from "@/components/brand/neolytics-brand";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ inviteToken?: string }>;
}) {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const { inviteToken } = await searchParams;
    let resolvedValue0: any;
  if (process.env.RECAPTCHA_SECRET_KEY?.trim()) {
    resolvedValue0 = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
  } else {
    resolvedValue0 = undefined;
  }
const recaptchaSiteKey = resolvedValue0;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-5">
        <NeolyticsBrand />
        <LoginForm
          inviteToken={inviteToken}
          hasGoogleLogin={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
          hasDiscordLogin={Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET)}
          hasAppleLogin={Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET)}
          recaptchaSiteKey={recaptchaSiteKey}
        />
      </div>
    </main>
  );
}

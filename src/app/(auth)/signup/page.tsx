import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NeolyticsBrand } from "@/components/brand/neolytics-brand";
import { SignupForm } from "@/components/auth/signup-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getOrganizationInvitationByToken } from "@/lib/organization-invitation-service";
import Link from "next/link";

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ inviteToken?: string }>;
}) {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const { inviteToken } = await searchParams;
    let resolvedValue0: any;
  if (inviteToken) {
    resolvedValue0 = await getOrganizationInvitationByToken(inviteToken);
  } else {
    resolvedValue0 = null;
  }
const invitation = resolvedValue0;
  const invalidInvitation = Boolean(
    inviteToken && (!invitation || invitation.revokedAt || invitation.acceptedAt || invitation.expiresAt <= new Date())
  );

    let resolvedValue1: any;
  if (invalidInvitation) {
    resolvedValue1 = (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Convite indisponível</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>Este convite não é mais válido. Você ainda pode criar uma nova organização do zero.</p>
              <Button asChild variant="outline">
                <Link href="/signup">Continuar sem convite</Link>
              </Button>
            </CardContent>
          </Card>
        );
  } else {
    resolvedValue1 = (
          <SignupForm
            inviteToken={inviteToken}
            hasGoogleLogin={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
            hasDiscordLogin={Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET)}
            hasAppleLogin={Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET)}
            invitedOrganizationName={invitation?.organization.name}
            invitedEmail={invitation?.email}
          />
        );
  }
return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_30%)] p-6">
      <div className="flex w-full max-w-lg flex-col items-center gap-5">
        <NeolyticsBrand />
        {resolvedValue1}
      </div>
    </main>
  );
}

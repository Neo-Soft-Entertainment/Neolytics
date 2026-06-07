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
  const invitation = inviteToken ? await getOrganizationInvitationByToken(inviteToken) : null;
  const invalidInvitation = Boolean(
    inviteToken && (!invitation || invitation.revokedAt || invitation.acceptedAt || invitation.expiresAt <= new Date())
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_30%)] p-6">
      <div className="flex w-full max-w-xl flex-col items-center gap-6">
        <NeolyticsBrand />
        {invalidInvitation ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Invitation unavailable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>This invitation is no longer valid. You can still create a new organization from scratch.</p>
              <Button asChild variant="outline">
                <Link href="/signup">Continue without invitation</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <SignupForm
            inviteToken={inviteToken}
            hasGoogleLogin={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
            hasDiscordLogin={Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET)}
            hasAppleLogin={Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET)}
            invitedOrganizationName={invitation?.organization.name}
            invitedEmail={invitation?.email}
          />
        )}
      </div>
    </main>
  );
}

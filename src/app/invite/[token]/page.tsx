import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { NeolyticsBrand } from "@/components/brand/neolytics-brand";
import { AcceptInvitationCard } from "@/components/organization/accept-invitation-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationInvitationByToken } from "@/lib/organization-invitation-service";
import { getOrganizationPermissionLabel } from "@/lib/organization-permissions";

export default async function InvitationPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getOrganizationInvitationByToken(token);

  if (!invitation) {
    notFound();
  }

  const session = await auth();
  const isExpired = invitation.expiresAt <= new Date();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_30%)] p-6">
      <div className="flex w-full max-w-xl flex-col items-center gap-6">
        <NeolyticsBrand />
        {invitation.revokedAt || invitation.acceptedAt || isExpired ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Invitation unavailable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>This invitation is no longer available.</p>
              <Button asChild variant="outline">
                <Link href="/">Back to home</Link>
              </Button>
            </CardContent>
          </Card>
        ) : !session?.user ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Invitation to {invitation.organization.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                {invitation.invitedBy.name || invitation.invitedBy.email} invited {invitation.email} to join as {invitation.role}.
              </p>
              <p>
                Permissions: {invitation.permissions.length > 0 ? invitation.permissions.map(getOrganizationPermissionLabel).join(", ") : "Role defaults only"}.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={`/login?inviteToken=${token}`}>Sign in</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/signup?inviteToken=${token}`}>Create account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <AcceptInvitationCard
            token={token}
            organizationName={invitation.organization.name}
            invitedEmail={invitation.email}
            permissions={invitation.permissions.map(getOrganizationPermissionLabel)}
            currentEmail={session.user.email}
          />
        )}
      </div>
    </main>
  );
}

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
              <CardTitle>Convite indisponível</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>Este convite não está mais disponível.</p>
              <Button asChild variant="outline">
                <Link href="/">Voltar para o início</Link>
              </Button>
            </CardContent>
          </Card>
        ) : !session?.user ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Convite para {invitation.organization.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                {invitation.invitedBy.name || invitation.invitedBy.email} convidou {invitation.email} para entrar como {invitation.role}.
              </p>
              <p>
                Permissões: {invitation.permissions.length > 0 ? invitation.permissions.map(getOrganizationPermissionLabel).join(", ") : "Apenas permissões padrão do cargo"}.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={`/login?inviteToken=${token}`}>Entrar</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/signup?inviteToken=${token}`}>Criar conta</Link>
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

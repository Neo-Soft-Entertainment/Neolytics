"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AcceptInvitationCard({
  token,
  organizationName,
  invitedEmail,
  permissions,
  currentEmail
}: {
  token: string;
  organizationName: string;
  invitedEmail: string;
  permissions: string[];
  currentEmail?: string | null;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function acceptInvite() {
    setIsSubmitting(true);
    setMessage(null);

    const response = await fetch("/api/organizations/invitations/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token })
    });

    setIsSubmitting(false);

    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setMessage(payload?.message ?? "Não foi possível aceitar o convite.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Entrar em {organizationName}</CardTitle>
        <CardDescription>
          Aceite este convite para entrar na organização e acessar a área de trabalho compartilhada da Neolytics.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>Email convidado: {invitedEmail}</p>
        <p>Permissões: {permissions.length > 0 ? permissions.join(", ") : "Apenas permissões padrão do cargo"}</p>
        <p>Logado como: {currentEmail ?? "Usuário desconhecido"}</p>
        {message ? <p className="text-destructive">{message}</p> : null}
        <Button disabled={isSubmitting} onClick={acceptInvite}>
          {isSubmitting ? "Aceitando..." : "Aceitar convite"}
        </Button>
      </CardContent>
    </Card>
  );
}

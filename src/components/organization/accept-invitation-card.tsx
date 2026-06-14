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

    let resolvedValue0: any;
  if (permissions.length > 0) {
    resolvedValue0 = permissions.join(", ");
  } else {
    resolvedValue0 = "Apenas permissões padrão do cargo";
  }
  let resolvedValue1: any;
  if (message) {
    resolvedValue1 = <p className="text-destructive">{message}</p>;
  } else {
    resolvedValue1 = null;
  }
  let resolvedValue2: any;
  if (isSubmitting) {
    resolvedValue2 = "Aceitando...";
  } else {
    resolvedValue2 = "Aceitar convite";
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
        <p>Permissões: {resolvedValue0}</p>
        <p>Logado como: {currentEmail ?? "Usuário desconhecido"}</p>
        {resolvedValue1}
        <Button disabled={isSubmitting} onClick={acceptInvite}>
          {resolvedValue2}
        </Button>
      </CardContent>
    </Card>
  );
}

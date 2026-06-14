"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OrganizationDangerZone({
  canDelete
}: {
  canDelete: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function deleteOrganization() {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      "Excluir esta organização permanentemente? Isso remove áreas de trabalho, projetos, relatórios, convites e acesso dos membros."
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);
    setError(null);
    setIsDeleting(true);

    const response = await fetch("/api/organizations", {
      method: "DELETE"
    });

    setIsDeleting(false);

    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setError(payload?.message ?? "Não foi possível excluir a organização.");
      return;
    }

    router.push("/setup");
    router.refresh();
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>Zona de risco</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Excluir a organização atual remove permanentemente suas áreas de trabalho, projetos, relatórios, convites,
          conjuntos de concorrentes, jogos salvos e acesso da equipe.
        </p>
        <Button
          disabled={!canDelete || isDeleting}
          onClick={deleteOrganization}
          type="button"
          variant="destructive"
        >
          {isDeleting ? "Excluindo..." : "Excluir organização"}
        </Button>
        {!canDelete ? (
          <p className="text-sm text-muted-foreground">Apenas proprietários da organização podem excluir a organização.</p>
        ) : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

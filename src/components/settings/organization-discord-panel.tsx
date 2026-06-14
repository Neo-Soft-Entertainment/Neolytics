"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OrganizationDiscordPanel({
  canManage,
  initialConfigured,
  initialEnabled
}: {
  canManage: boolean;
  initialConfigured: boolean;
  initialEnabled: boolean;
}) {
  const router = useRouter();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [configured, setConfigured] = useState(initialConfigured);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  async function saveWebhook() {
    setIsSaving(true);
    setMessage(null);

    const response = await fetch("/api/organizations/discord-webhook", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        webhookUrl,
        enabled
      })
    });

    setIsSaving(false);

    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      discordWebhookConfigured?: boolean;
      discordWebhookEnabled?: boolean;
    } | null;

    if (!response.ok) {
      setMessage(payload?.message ?? "Não foi possível salvar as configurações do Discord.");
      return;
    }

    setConfigured(Boolean(payload?.discordWebhookConfigured));
    setEnabled(Boolean(payload?.discordWebhookEnabled));
    setWebhookUrl("");
    setMessage("Configurações do webhook do Discord salvas.");
    router.refresh();
  }

  async function sendTestWebhook() {
    setIsTesting(true);
    setMessage(null);

    const response = await fetch("/api/organizations/discord-webhook", {
      method: "POST"
    });

    setIsTesting(false);

    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setMessage(payload?.message ?? "Não foi possível enviar o webhook de teste.");
      return;
    }

    setMessage("Webhook de teste enviado ao Discord.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhooks do Discord</CardTitle>
        <CardDescription>
          Envie alertas da organização para o Discord quando convites, relatórios, projetos e análises de projeto acontecerem.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="discord-webhook-url">URL do webhook</Label>
          <Input
            id="discord-webhook-url"
            placeholder={configured ? "Webhook configurado. Cole uma nova URL para substituir." : "https://discord.com/api/webhooks/..."}
            value={webhookUrl}
            onChange={(event) => setWebhookUrl(event.target.value)}
            readOnly={!canManage}
          />
          {configured ? (
            <p className="text-xs text-muted-foreground">O webhook salvo está criptografado e oculto. Cole uma nova URL somente se quiser substituí-lo.</p>
          ) : null}
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            checked={enabled}
            className="h-4 w-4"
            disabled={!canManage}
            onChange={(event) => setEnabled(event.target.checked)}
            type="checkbox"
          />
          Ativar notificações do Discord para esta organização
        </label>
        <div className="flex flex-wrap gap-3">
          <Button disabled={!canManage || isSaving} onClick={saveWebhook} type="button">
            {isSaving ? "Salvando..." : "Salvar webhook"}
          </Button>
          <Button
            disabled={!canManage || (!configured && !webhookUrl.trim()) || !enabled || isTesting}
            onClick={sendTestWebhook}
            type="button"
            variant="outline"
          >
            {isTesting ? "Enviando..." : "Enviar teste"}
          </Button>
        </div>
        {!canManage ? (
          <p className="text-sm text-muted-foreground">
            Apenas administradores da organização podem gerenciar integrações do Discord.
          </p>
        ) : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

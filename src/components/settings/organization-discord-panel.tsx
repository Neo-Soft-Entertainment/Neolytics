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

    let resolvedValue0: any;
  if (configured) {
    resolvedValue0 = "Webhook configurado. Cole uma nova URL para substituir.";
  } else {
    resolvedValue0 = "https://discord.com/api/webhooks/...";
  }
  let resolvedValue1: any;
  if (configured) {
    resolvedValue1 = (
            <p className="text-xs text-muted-foreground">O webhook salvo está criptografado e oculto. Cole uma nova URL somente se quiser substituí-lo.</p>
          );
  } else {
    resolvedValue1 = null;
  }
  let resolvedValue2: any;
  if (isSaving) {
    resolvedValue2 = "Salvando...";
  } else {
    resolvedValue2 = "Salvar webhook";
  }
  let resolvedValue3: any;
  if (isTesting) {
    resolvedValue3 = "Enviando...";
  } else {
    resolvedValue3 = "Enviar teste";
  }
  let resolvedValue4: any;
  if (!canManage) {
    resolvedValue4 = (
          <p className="text-sm text-muted-foreground">
            Apenas administradores da organização podem gerenciar integrações do Discord.
          </p>
        );
  } else {
    resolvedValue4 = null;
  }
  let resolvedValue5: any;
  if (message) {
    resolvedValue5 = <p className="text-sm text-muted-foreground">{message}</p>;
  } else {
    resolvedValue5 = null;
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
            placeholder={resolvedValue0}
            value={webhookUrl}
            onChange={(event: any) => setWebhookUrl(event.target.value)}
            readOnly={!canManage}
          />
          {resolvedValue1}
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            checked={enabled}
            className="h-4 w-4"
            disabled={!canManage}
            onChange={(event: any) => setEnabled(event.target.checked)}
            type="checkbox"
          />
          Ativar notificações do Discord para esta organização
        </label>
        <div className="flex flex-wrap gap-3">
          <Button disabled={!canManage || isSaving} onClick={saveWebhook} type="button">
            {resolvedValue2}
          </Button>
          <Button
            disabled={!canManage || (!configured && !webhookUrl.trim()) || !enabled || isTesting}
            onClick={sendTestWebhook}
            type="button"
            variant="outline"
          >
            {resolvedValue3}
          </Button>
        </div>
        {resolvedValue4}
        {resolvedValue5}
      </CardContent>
    </Card>
  );
}

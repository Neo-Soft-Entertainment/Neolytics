"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  organizationName: z.string().min(2),
  workspaceName: z.string().min(2)
});

type FormValues = z.infer<typeof schema>;

export function CreateOrganizationForm({
  compact = false
}: {
  compact?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationName: "",
      workspaceName: "Área de trabalho padrão"
    }
  });

  async function onSubmit(values: FormValues) {
    setError(null);

    const response = await fetch("/api/organizations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? "Não foi possível criar a organização.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

    let resolvedValue0: any;
  if (compact) {
    resolvedValue0 = "grid gap-3";
  } else {
    resolvedValue0 = "grid gap-4 md:grid-cols-2";
  }
  let resolvedValue1: any;
  if (form.formState.errors.organizationName) {
    resolvedValue1 = (
          <p className="text-sm text-destructive">{form.formState.errors.organizationName.message}</p>
        );
  } else {
    resolvedValue1 = null;
  }
  let resolvedValue2: any;
  if (form.formState.errors.workspaceName) {
    resolvedValue2 = (
          <p className="text-sm text-destructive">{form.formState.errors.workspaceName.message}</p>
        );
  } else {
    resolvedValue2 = null;
  }
  let resolvedValue3: any;
  if (error) {
    resolvedValue3 = <p className="text-sm text-destructive md:col-span-2">{error}</p>;
  } else {
    resolvedValue3 = null;
  }
  let resolvedValue4: any;
  if (form.formState.isSubmitting) {
    resolvedValue4 = "Criando...";
  } else {
    resolvedValue4 = "Criar organização";
  }
return (
    <form className={resolvedValue0} onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="organizationName">Nome da organização</Label>
        <Input id="organizationName" placeholder="Northstar Studio" {...form.register("organizationName")} />
        {resolvedValue1}
      </div>
      <div className="space-y-2">
        <Label htmlFor="workspaceName">Nome da área de trabalho</Label>
        <Input id="workspaceName" placeholder="Portfólio principal" {...form.register("workspaceName")} />
        {resolvedValue2}
      </div>
      {resolvedValue3}
      <p className="text-xs text-muted-foreground md:col-span-2">
        Novas organizações começam no plano Free. Idioma e país padrão podem ser ajustados depois em Empresa.
      </p>
      <div className="md:col-span-2">
        <Button disabled={form.formState.isSubmitting} type="submit">
          {resolvedValue4}
        </Button>
      </div>
    </form>
  );
}

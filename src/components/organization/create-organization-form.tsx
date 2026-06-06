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
      workspaceName: "Default Workspace"
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
      setError(payload?.message ?? "Unable to create organization.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className={compact ? "grid gap-3" : "grid gap-4 md:grid-cols-2"} onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="organizationName">Organization name</Label>
        <Input id="organizationName" placeholder="Northstar Studio" {...form.register("organizationName")} />
        {form.formState.errors.organizationName ? (
          <p className="text-sm text-destructive">{form.formState.errors.organizationName.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="workspaceName">Workspace name</Label>
        <Input id="workspaceName" placeholder="Core Portfolio" {...form.register("workspaceName")} />
        {form.formState.errors.workspaceName ? (
          <p className="text-sm text-destructive">{form.formState.errors.workspaceName.message}</p>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      <div className="md:col-span-2">
        <Button disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? "Creating..." : "Create organization"}
        </Button>
      </div>
    </form>
  );
}

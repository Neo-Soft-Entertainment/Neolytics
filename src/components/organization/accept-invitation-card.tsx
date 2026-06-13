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
      setMessage(payload?.message ?? "Unable to accept invitation.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Join {organizationName}</CardTitle>
        <CardDescription>
          Accept this invitation to join the organization and access the shared Neolytics workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>Invited email: {invitedEmail}</p>
        <p>Permissions: {permissions.length > 0 ? permissions.join(", ") : "Role defaults only"}</p>
        <p>Signed in as: {currentEmail ?? "Unknown user"}</p>
        {message ? <p className="text-destructive">{message}</p> : null}
        <Button disabled={isSubmitting} onClick={acceptInvite}>
          {isSubmitting ? "Accepting..." : "Accept invitation"}
        </Button>
      </CardContent>
    </Card>
  );
}

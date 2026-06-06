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
      "Delete this organization permanently? This removes workspaces, projects, reports, invites, and member access."
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
      setError(payload?.message ?? "Unable to delete organization.");
      return;
    }

    router.push("/setup");
    router.refresh();
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>Danger zone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Deleting the current organization permanently removes its workspaces, projects, reports, invitations,
          competitor sets, saved games, and team access.
        </p>
        <Button
          disabled={!canDelete || isDeleting}
          onClick={deleteOrganization}
          type="button"
          variant="destructive"
        >
          {isDeleting ? "Deleting..." : "Delete organization"}
        </Button>
        {!canDelete ? (
          <p className="text-sm text-muted-foreground">Only organization owners can delete the organization.</p>
        ) : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

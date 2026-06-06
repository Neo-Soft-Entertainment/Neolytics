"use client";

import { OrganizationRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function OrganizationMembersPanel({
  canManage,
  members,
  invitations
}: {
  canManage: boolean;
  members: Array<{
    userId: string;
    role: OrganizationRole;
    joinedAt: Date;
    user: {
      name: string | null;
      email: string;
    };
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: OrganizationRole;
    token: string;
    expiresAt: Date;
    createdAt: Date;
  }>;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationRole>(OrganizationRole.MEMBER);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  async function createInvite() {
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/organizations/invitations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        role
      })
    });

    setIsSubmitting(false);

    const payload = (await response.json().catch(() => null)) as { message?: string; token?: string } | null;

    if (!response.ok) {
      setError(payload?.message ?? "Unable to create invitation.");
      return;
    }

    const inviteUrl = `${window.location.origin}/invite/${payload?.token}`;

    await navigator.clipboard.writeText(inviteUrl).catch(() => {});
    setEmail("");
    setRole(OrganizationRole.MEMBER);
    setLastInviteUrl(inviteUrl);
    setMessage("Invitation created. The invite link was copied to your clipboard.");
    router.refresh();
  }

  async function revokeInvite(invitationId: string) {
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/organizations/invitations/${invitationId}`, {
      method: "DELETE"
    });

    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setError(payload?.message ?? "Unable to revoke invitation.");
      return;
    }

    setMessage("Invitation revoked.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Organization members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {members.map((member) => (
            <div key={member.userId} className="rounded-2xl border p-4">
              <p className="font-medium">{member.user.name || member.user.email}</p>
              <p className="mt-1 text-muted-foreground">
                {member.user.email} · {member.role}
              </p>
              <p className="mt-1 text-muted-foreground">
                Joined {new Date(member.joinedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pending invitations ({invitations.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {invitations.length > 0 ? invitations.map((invitation) => (
            <div key={invitation.id} className="rounded-2xl border p-4">
              <p className="font-medium">{invitation.email}</p>
              <p className="mt-1 text-muted-foreground">
                Role: {invitation.role} · Expires {new Date(invitation.expiresAt).toLocaleDateString()}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    const inviteUrl = `${window.location.origin}/invite/${invitation.token}`;
                    await navigator.clipboard.writeText(inviteUrl).catch(() => {});
                    setMessage("Invitation link copied.");
                  }}
                >
                  Copy link
                </Button>
                {canManage ? (
                  <Button variant="outline" onClick={() => revokeInvite(invitation.id)}>
                    Revoke
                  </Button>
                ) : null}
              </div>
            </div>
          )) : (
            <p className="text-muted-foreground">No pending invitations.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Invite teammate</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@studio.com"
              readOnly={!canManage}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as OrganizationRole)} disabled={!canManage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OrganizationRole.ADMIN}>ADMIN</SelectItem>
                <SelectItem value={OrganizationRole.MEMBER}>MEMBER</SelectItem>
                <SelectItem value={OrganizationRole.VIEWER}>VIEWER</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full" disabled={!canManage || isSubmitting} onClick={createInvite}>
              {isSubmitting ? "Inviting..." : "Invite"}
            </Button>
          </div>
          {lastInviteUrl ? (
            <div className="space-y-2 lg:col-span-3">
              <Label htmlFor="invite-link">Last invite link</Label>
              <div className="flex flex-col gap-2 md:flex-row">
                <Input id="invite-link" readOnly value={lastInviteUrl} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(lastInviteUrl).catch(() => {});
                    setMessage("Invitation link copied.");
                  }}
                >
                  Copy link
                </Button>
              </div>
            </div>
          ) : null}
          {!canManage ? (
            <p className="text-sm text-muted-foreground lg:col-span-3">
              Only organization admins can invite new members.
            </p>
          ) : null}
          {message ? <p className="text-sm text-emerald-600 lg:col-span-3">{message}</p> : null}
          {error ? <p className="text-sm text-destructive lg:col-span-3">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

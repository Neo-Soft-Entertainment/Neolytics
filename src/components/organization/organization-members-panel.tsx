"use client";

import { OrganizationPermission, OrganizationRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  getDefaultOrganizationPermissions,
  getOrganizationPermissionLabel,
  organizationPermissionOptions
} from "@/lib/organization-permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function canCopyInvitationToken(token: string) {
  return !/^[a-f0-9]{64}$/i.test(token);
}

function PermissionBadges({ permissions }: { permissions: OrganizationPermission[] }) {
  if (permissions.length === 0) {
    return <p className="text-xs text-muted-foreground">Role defaults only</p>;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {permissions.map((permission) => (
        <Badge key={permission} variant="secondary" className="border-white/10 bg-white/55 font-medium dark:bg-white/[0.04]">
          {getOrganizationPermissionLabel(permission)}
        </Badge>
      ))}
    </div>
  );
}

export function OrganizationMembersPanel({
  canManage,
  members,
  invitations
}: {
  canManage: boolean;
  members: Array<{
    userId: string;
    role: OrganizationRole;
    permissions: OrganizationPermission[];
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
    permissions: OrganizationPermission[];
    token: string;
    expiresAt: Date;
    createdAt: Date;
  }>;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationRole>(OrganizationRole.MEMBER);
  const [permissions, setPermissions] = useState<OrganizationPermission[]>(getDefaultOrganizationPermissions(OrganizationRole.MEMBER));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  function updateRole(value: OrganizationRole) {
    setRole(value);
    setPermissions(getDefaultOrganizationPermissions(value));
  }

  function togglePermission(permission: OrganizationPermission) {
    setPermissions((current) => {
      if (current.includes(permission)) {
        return current.filter((item) => item !== permission);
      }

      return [...current, permission];
    });
  }

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
        role,
        permissions
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
    updateRole(OrganizationRole.MEMBER);
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
      <Card className="overflow-hidden">
        <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
        <CardHeader>
          <CardTitle>Organization members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {members.map((member) => (
            <div key={member.userId} className="rounded-[1.5rem] border border-white/10 bg-white/45 p-4 backdrop-blur dark:bg-white/[0.03]">
              <p className="font-medium">{member.user.name || member.user.email}</p>
              <p className="mt-1 text-muted-foreground">
                {member.user.email} · {member.role}
              </p>
              <PermissionBadges permissions={member.permissions} />
              <p className="mt-1 text-muted-foreground">
                Joined {new Date(member.joinedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
        <CardHeader>
          <CardTitle>Pending invitations ({invitations.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {invitations.length > 0 ? invitations.map((invitation) => (
            <div key={invitation.id} className="rounded-[1.5rem] border border-white/10 bg-white/45 p-4 backdrop-blur dark:bg-white/[0.03]">
              <p className="font-medium">{invitation.email}</p>
              <p className="mt-1 text-muted-foreground">
                Role: {invitation.role} · Expires {new Date(invitation.expiresAt).toLocaleDateString()}
              </p>
              <PermissionBadges permissions={invitation.permissions} />
              <div className="mt-3 flex flex-wrap gap-2">
                {canCopyInvitationToken(invitation.token) ? (
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
                ) : (
                  <p className="rounded-full border border-white/10 px-3 py-2 text-xs text-muted-foreground">
                    Link is hidden. Revoke and recreate to copy a new invite.
                  </p>
                )}
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
      <Card className="overflow-hidden">
        <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
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
            <Select value={role} onValueChange={(value) => updateRole(value as OrganizationRole)} disabled={!canManage}>
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
          <div className="space-y-3 rounded-lg border border-white/10 bg-white/35 p-3 lg:col-span-3 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Permissions</p>
                <p className="mt-1 text-xs text-muted-foreground">Access applied when the invitation is accepted.</p>
              </div>
              <Badge variant="secondary" className="w-fit border-white/10 bg-white/55 dark:bg-white/[0.04]">
                {permissions.length} selected
              </Badge>
            </div>
            <div className="grid gap-1.5 md:grid-cols-2">
              {organizationPermissionOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-14 items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-white/45 dark:hover:bg-white/[0.04]"
                >
                  <input
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                    type="checkbox"
                    checked={permissions.includes(option.value)}
                    disabled={!canManage}
                    onChange={() => togglePermission(option.value)}
                  />
                  <span className="min-w-0">
                    <span className="block leading-5">{option.label}</span>
                    <span className="block text-xs leading-4 text-muted-foreground">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
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

import { auth } from "@/auth";
import { getCurrentOrganization } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { getSubscriptionPlanLabel } from "@/lib/subscription-plans";
import { getOrganizationSubscriptionSnapshot } from "@/lib/subscription-service";

import { CreateOrganizationForm } from "@/components/organization/create-organization-form";
import { OrganizationMembersPanel } from "@/components/organization/organization-members-panel";
import { CreateWorkspaceForm } from "@/components/organization/create-workspace-form";
import { OrganizationDiscordPanel } from "@/components/settings/organization-discord-panel";
import { SubscriptionPanel } from "@/components/settings/subscription-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export async function SettingsPage() {
  const [session, organization] = await Promise.all([auth(), getCurrentOrganization()]);
  const [subscriptionSnapshot, currentMembers, invitations] = await Promise.all([
    getOrganizationSubscriptionSnapshot(organization.id),
    db.organizationMember.findMany({
      where: {
        organizationId: organization.id
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        joinedAt: "asc"
      }
    }),
    db.organizationInvitation.findMany({
      where: {
        organizationId: organization.id,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })
  ]);
  const memberships = session?.user?.id
    ? await db.organizationMember.findMany({
        where: {
          userId: session.user.id
        },
        include: {
          organization: {
            include: {
              workspaces: {
                orderBy: {
                  createdAt: "asc"
                }
              }
            }
          }
        },
        orderBy: {
          joinedAt: "asc"
        }
      })
    : [];
  const currentMembership = memberships.find((membership) => membership.organizationId === organization.id);
  const canManageSubscription = currentMembership?.role === "OWNER" || currentMembership?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage account access, organizations, and the workspaces that power your market research.
        </p>
      </div>
      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
          <TabsTrigger value="user">User</TabsTrigger>
        </TabsList>
        <TabsContent value="organization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Name: {organization.name}</p>
              <p>Slug: {organization.slug}</p>
              <p>Subscription plan: {subscriptionSnapshot.planLabel}</p>
              <p>Workspaces: {organization.workspaces.length}</p>
            </CardContent>
          </Card>
          <SubscriptionPanel snapshot={subscriptionSnapshot} canManage={canManageSubscription} />
          <OrganizationDiscordPanel
            canManage={canManageSubscription}
            initialEnabled={organization.discordWebhookEnabled}
            initialWebhookUrl={organization.discordWebhookUrl}
          />
          <OrganizationMembersPanel
            canManage={canManageSubscription}
            members={currentMembers}
            invitations={invitations}
          />
          <Card>
            <CardHeader>
              <CardTitle>Create another organization</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateOrganizationForm compact />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Your organizations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {memberships.map((membership) => (
                <div key={membership.organizationId} className="rounded-2xl border p-4">
                  <p className="font-medium">{membership.organization.name}</p>
                  <p className="mt-1 text-muted-foreground">
                    Role: {membership.role} · Plan: {getSubscriptionPlanLabel(membership.organization.subscriptionPlan)}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {membership.organization.workspaces.length} workspace(s)
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="workspaces" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create workspace</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateWorkspaceForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Workspace list</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {organization.workspaces.map((workspace) => (
                <div key={workspace.id} className="rounded-2xl border p-4">
                  <p className="font-medium">{workspace.name}</p>
                  <p className="mt-1 text-muted-foreground">Slug: {workspace.slug}</p>
                  <p className="mt-1 text-muted-foreground">
                    {workspace.description || "No description yet."}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="user">
          <Card>
            <CardHeader>
              <CardTitle>User settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Name: {session?.user?.name ?? "N/A"}</p>
              <p>Email: {session?.user?.email ?? "N/A"}</p>
              <p>Organizations: {memberships.length}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

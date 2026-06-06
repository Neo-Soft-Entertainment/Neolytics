import { auth } from "@/auth";
import { CreateOrganizationForm } from "@/components/organization/create-organization-form";
import { CreateWorkspaceForm } from "@/components/organization/create-workspace-form";
import { OrganizationMembersPanel } from "@/components/organization/organization-members-panel";
import { OrganizationDangerZone } from "@/components/settings/organization-danger-zone";
import { OrganizationDiscordPanel } from "@/components/settings/organization-discord-panel";
import { SubscriptionPanel } from "@/components/settings/subscription-panel";
import { WorkspaceManagementPanel } from "@/components/settings/workspace-management-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentOrganization } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { getSubscriptionPlanLabel } from "@/lib/subscription-plans";
import { getOrganizationSubscriptionSnapshot } from "@/lib/subscription-service";

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
  const canDeleteOrganization = currentMembership?.role === "OWNER";
  const hasGoogleLogin = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const hasGoogleSheets = Boolean(process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY);
  const seatLimitLabel = subscriptionSnapshot.limits.seats === null
    ? "Unlimited"
    : `${subscriptionSnapshot.usage.seats}/${subscriptionSnapshot.limits.seats}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage account access, organizations, and the workspaces that power your market research.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{subscriptionSnapshot.planLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">{organization.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Seats</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{seatLimitLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">Pending invites: {invitations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Workspaces</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{organization.workspaces.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Active operating spaces</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{memberships.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Org memberships on this account</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="organization" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 md:grid-cols-3">
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
          <TabsTrigger value="user">User</TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current organization</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm md:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
                <p className="mt-2 font-medium">{organization.name}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Slug</p>
                <p className="mt-2 font-medium">{organization.slug}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Subscription</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-medium">{subscriptionSnapshot.planLabel}</span>
                  <Badge variant="secondary">{subscriptionSnapshot.status}</Badge>
                </div>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Workspaces</p>
                <p className="mt-2 font-medium">{organization.workspaces.length}</p>
              </div>
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
            <CardContent className="grid gap-3 text-sm lg:grid-cols-2">
              {memberships.map((membership) => (
                <div key={membership.organizationId} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{membership.organization.name}</p>
                      <p className="mt-1 text-muted-foreground">
                        {membership.organization.workspaces.length} workspace(s)
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={membership.organizationId === organization.id ? "default" : "secondary"}>
                        {membership.organizationId === organization.id ? "Current" : membership.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getSubscriptionPlanLabel(membership.organization.subscriptionPlan)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <OrganizationDangerZone canDelete={Boolean(canDeleteOrganization)} />
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

          <WorkspaceManagementPanel
            canManage={Boolean(canManageSubscription)}
            workspaces={organization.workspaces}
          />
        </TabsContent>

        <TabsContent value="user" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Name: {session?.user?.name ?? "N/A"}</p>
              <p>Email: {session?.user?.email ?? "N/A"}</p>
              <p>Organizations: {memberships.length}</p>
              <p>Current role: {currentMembership?.role ?? "N/A"}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Google integrations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Google login</p>
                    <Badge variant={hasGoogleLogin ? "default" : "secondary"}>
                      {hasGoogleLogin ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {hasGoogleLogin
                      ? "The login page now shows Continue with Google."
                      : "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment."}
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Google Sheets export</p>
                    <Badge variant={hasGoogleSheets ? "default" : "secondary"}>
                      {hasGoogleSheets ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {hasGoogleSheets
                      ? "Export menus can publish workbooks directly to Google Sheets."
                      : "Set GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY to enable it."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Access summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Primary organization</p>
                  <p className="mt-1 text-muted-foreground">{organization.name}</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Seat usage</p>
                  <p className="mt-1 text-muted-foreground">{seatLimitLabel}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

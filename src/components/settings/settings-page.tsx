import { auth } from "@/auth";
import { getCurrentOrganization } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

import { CreateOrganizationForm } from "@/components/organization/create-organization-form";
import { CreateWorkspaceForm } from "@/components/organization/create-workspace-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export async function SettingsPage() {
  const [session, organization] = await Promise.all([auth(), getCurrentOrganization()]);
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
              <p>Subscription plan: {organization.subscriptionPlan}</p>
              <p>Workspaces: {organization.workspaces.length}</p>
            </CardContent>
          </Card>
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
                    Role: {membership.role} · Plan: {membership.organization.subscriptionPlan}
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

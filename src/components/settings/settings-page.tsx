import { auth } from "@/auth";
import { getCurrentOrganization } from "@/lib/auth-helpers";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export async function SettingsPage() {
  const [session, organization] = await Promise.all([auth(), getCurrentOrganization()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organization and user context for the current Neolytics workspace.
        </p>
      </div>
      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="user">User</TabsTrigger>
        </TabsList>
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Organization settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Name: {organization.name}</p>
              <p>Slug: {organization.slug}</p>
              <p>Subscription plan: {organization.subscriptionPlan}</p>
              <p>Workspaces: {organization.workspaces.length}</p>
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
              <p>Organizations: {session?.user?.organizations.length ?? 0}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { AppHeader } from "@/components/app-shell/app-header";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { auth } from "@/auth";
import { getCurrentOrganization } from "@/lib/auth-helpers";

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const [session, organization] = await Promise.all([auth(), getCurrentOrganization()]);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.09),_transparent_28%)]" />
          <AppHeader
            currentOrganizationId={organization.id}
            organizationName={organization.name}
            currentWorkspaceId={organization.currentWorkspace?.id ?? null}
            currentWorkspaceName={organization.currentWorkspace?.name ?? null}
            organizations={session?.user.organizations ?? []}
            subscriptionPlan={organization.subscriptionPlan}
            workspaces={organization.workspaces}
          />
          <main className="relative flex-1 px-4 py-5 pb-8 lg:px-8 lg:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

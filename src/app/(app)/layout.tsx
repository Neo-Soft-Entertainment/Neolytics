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
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <AppHeader
            currentOrganizationId={organization.id}
            organizationName={organization.name}
            organizations={session?.user.organizations ?? []}
            subscriptionPlan={organization.subscriptionPlan}
          />
          <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

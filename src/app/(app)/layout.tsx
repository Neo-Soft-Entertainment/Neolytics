import { AppHeader } from "@/components/app-shell/app-header";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { getCurrentOrganization } from "@/lib/auth-helpers";

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const organization = await getCurrentOrganization();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <AppHeader
            organizationName={organization.name}
            subscriptionPlan={organization.subscriptionPlan}
          />
          <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

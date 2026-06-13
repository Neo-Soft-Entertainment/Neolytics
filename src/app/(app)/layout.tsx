import { AppHeader } from "@/components/app-shell/app-header";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { auth } from "@/auth";
import { languageOptions } from "@/lib/company-localization";
import { getCurrentOrganization } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { uiLanguages } from "@/lib/i18n";

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const [session, organization] = await Promise.all([auth(), getCurrentOrganization()]);
  const currentUser = session?.user?.id
    ? await db.user.findUnique({
        where: {
          id: session.user.id
        },
        select: {
          name: true,
          email: true,
          image: true,
          preferredLanguage: true
        }
      })
    : null;
  const organizations = session?.user?.id
    ? await db.organizationMember.findMany({
        where: {
          userId: session.user.id
        },
        include: {
          organization: true
        },
        orderBy: {
          joinedAt: "asc"
        }
      })
    : [];

  return (
    <div className="min-h-screen bg-transparent">
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden">
          <AppHeader
            currentOrganizationId={organization.id}
            organizationName={organization.name}
            currentWorkspaceId={organization.currentWorkspace?.id ?? null}
            currentWorkspaceName={organization.currentWorkspace?.name ?? null}
            organizations={organizations.map((membership) => ({
              id: membership.organization.id,
              name: membership.organization.name,
              role: membership.role,
              subscriptionPlan: membership.organization.subscriptionPlan
            }))}
            user={{
              name: currentUser?.name ?? session?.user?.name ?? null,
              email: currentUser?.email ?? session?.user?.email ?? null,
              image: currentUser?.image ?? session?.user?.image ?? null,
              preferredLanguage: currentUser?.preferredLanguage ?? session?.user?.preferredLanguage ?? "en"
            }}
            languageOptions={languageOptions.filter((option) =>
              uiLanguages.includes(option.value as (typeof uiLanguages)[number])
            )}
            subscriptionPlan={organization.subscriptionPlan}
            workspaces={organization.workspaces}
          />
          <main className="relative flex-1 px-4 py-5 pb-8 lg:px-8 lg:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

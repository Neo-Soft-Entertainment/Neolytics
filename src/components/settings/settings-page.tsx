import { auth } from "@/auth";
import { PageHero } from "@/components/app-shell/page-hero";
import { CreateOrganizationForm } from "@/components/organization/create-organization-form";
import { CreateWorkspaceForm } from "@/components/organization/create-workspace-form";
import { OrganizationMembersPanel } from "@/components/organization/organization-members-panel";
import { AccountSecurityPanel } from "@/components/settings/account-security-panel";
import { OrganizationMembershipsPanel } from "@/components/settings/organization-memberships-panel";
import { OrganizationDangerZone } from "@/components/settings/organization-danger-zone";
import { OrganizationDiscordPanel } from "@/components/settings/organization-discord-panel";
import { PrivacyPanel } from "@/components/settings/privacy-panel";
import { SubscriptionPanel } from "@/components/settings/subscription-panel";
import { WorkspaceManagementPanel } from "@/components/settings/workspace-management-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { env } from "@/env";
import { getCurrentOrganization } from "@/lib/auth-helpers";
import { canManageOrganization, canManageWorkspaces } from "@/lib/authorization";
import { db } from "@/lib/db";
import { translate } from "@/lib/i18n";
import { listUserConsentState } from "@/lib/privacy/consent-service";
import { listAdminDataSubjectRequests, listUserDataSubjectRequests } from "@/lib/privacy/data-subject-request-service";
import { listDataProducts } from "@/lib/privacy/data-product-service";
import { listProcessingPurposes } from "@/lib/privacy/processing-purposes";
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
  const language = session?.user?.preferredLanguage ?? "en";
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(language, key, values);
  const currentMembership = memberships.find((membership) => membership.organizationId === organization.id);
  const canManageSubscription = currentMembership?.role === "OWNER" || currentMembership?.role === "ADMIN";
  const canManageAccess = currentMembership
    ? canManageOrganization(currentMembership.role, currentMembership.permissions)
    : false;
  const canManageWorkspaceSettings = currentMembership
    ? canManageWorkspaces(currentMembership.role, currentMembership.permissions)
    : false;
  const canDeleteOrganization = currentMembership?.role === "OWNER";
  const hasGoogleLogin = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const hasDiscordLogin = Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
  const hasAppleLogin = Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET);
  const hasGoogleSheets = Boolean(process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY);
  const seatLimitLabel = subscriptionSnapshot.limits.seats === null
    ? "Unlimited"
    : `${subscriptionSnapshot.usage.seats}/${subscriptionSnapshot.limits.seats}`;
  const privacyPurposes = listProcessingPurposes();
  const privacyConsents = session?.user?.id ? await listUserConsentState(session.user.id) : [];
  const privacyRequests = session?.user?.id ? await listUserDataSubjectRequests(session.user.id) : [];
  const privacyAdminSnapshot = canManageSubscription
    ? await Promise.all([
        db.userConsent.count(),
        db.dataSubjectRequest.count({
          where: {
            organizationId: organization.id
          }
        }),
        db.privacyIncident.count({
          where: {
            OR: [
              { organizationId: organization.id },
              { organizationId: null }
            ]
          }
        }),
        db.privacyAuditLog.count({
          where: {
            OR: [
              { organizationId: organization.id },
              { organizationId: null }
            ]
          }
        }),
        db.privacyLegalHold.count({
          where: {
            OR: [
              { organizationId: organization.id },
              { organizationId: null }
            ],
            active: true
          }
        }),
        listAdminDataSubjectRequests(organization.id),
        listDataProducts(organization.id),
        db.privacyIncident.findMany({
          where: {
            OR: [
              { organizationId: organization.id },
              { organizationId: null }
            ]
          },
          orderBy: {
            discoveredAt: "desc"
          },
          take: 8
        }),
        db.privacyAuditLog.findMany({
          where: {
            OR: [
              { organizationId: organization.id },
              { organizationId: null }
            ]
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 8
        })
      ]).then(([
        consentCount,
        requestCount,
        incidentCount,
        auditLogCount,
        legalHoldCount,
        adminRequests,
        adminProducts,
        adminIncidents,
        adminAuditLogs
      ]) => ({
        stats: {
          consents: consentCount,
          requests: requestCount,
          products: adminProducts.length,
          incidents: incidentCount,
          auditLogs: auditLogCount,
          legalHolds: legalHoldCount
        },
        requests: adminRequests.map((item) => ({
          id: item.id,
          requestType: item.requestType,
          status: item.status,
          reason: item.reason,
          dueAt: item.dueAt.toISOString(),
          createdAt: item.createdAt.toISOString(),
          completedAt: item.completedAt?.toISOString() ?? null,
          user: {
            email: item.user.email,
            name: item.user.name
          },
          handledBy: item.handledBy
            ? {
                email: item.handledBy.email,
                name: item.handledBy.name
              }
            : null
        })),
        products: adminProducts.map((item) => ({
          id: item.id,
          productName: item.productName,
          productType: item.productType,
          approvalStatus: item.approvalStatus,
          minimumCohortSize: item.minimumCohortSize,
          privacyRiskScore: item.privacyRiskScore
        })),
        incidents: adminIncidents.map((item) => ({
          id: item.id,
          severity: item.severity,
          status: item.status,
          discoveredAt: item.discoveredAt.toISOString()
        })),
        auditLogs: adminAuditLogs.map((item) => ({
          id: item.id,
          action: item.action,
          resourceType: item.resourceType,
          decision: item.decision,
          createdAt: item.createdAt.toISOString()
        }))
      }))
    : null;

  return (
    <div className="space-y-6">
      <PageHero
        title="Settings"
        description="Manage account access, workspace structure, billing, and integrations."
        actions={(
          <>
            <Badge variant="secondary" className="border-white/10 bg-white/55 px-3 py-1 backdrop-blur dark:bg-white/[0.04]">
              {subscriptionSnapshot.planLabel}
            </Badge>
            <Badge variant="secondary" className="border-white/10 bg-white/55 px-3 py-1 backdrop-blur dark:bg-white/[0.04]">
              {organization.name}
            </Badge>
          </>
        )}
        summary={(
          <div className="grid gap-2.5 rounded-[1rem] border border-white/10 bg-background/70 p-3 text-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Seats</span>
              <span className="font-medium">{seatLimitLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Organizations</span>
              <span className="font-medium">{memberships.length}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/35 p-3 dark:bg-white/[0.04]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Ops control</p>
              <p className="mt-2 font-medium">Access, ownership, billing, and org setup.</p>
            </div>
          </div>
        )}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{subscriptionSnapshot.planLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">{organization.name}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Seats</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{seatLimitLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">Pending invites: {invitations.length}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Workspaces</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{organization.workspaces.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Active operating spaces</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
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
        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-[1rem] border border-white/10 bg-white/55 p-1.5 backdrop-blur md:grid-cols-4 dark:bg-white/[0.04]">
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
          <TabsTrigger value="user">Account</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="space-y-4">
          <Card className="overflow-hidden">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader>
              <CardTitle>Current organization</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
                <p className="mt-2 font-medium">{organization.name}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Slug</p>
                <p className="mt-2 font-medium">{organization.slug}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Subscription</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-medium">{subscriptionSnapshot.planLabel}</span>
                  <Badge variant="secondary">{subscriptionSnapshot.status}</Badge>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Workspaces</p>
                <p className="mt-2 font-medium">{organization.workspaces.length}</p>
              </div>
            </CardContent>
          </Card>

          <SubscriptionPanel snapshot={subscriptionSnapshot} canManage={canManageSubscription} />

          <OrganizationDiscordPanel
            canManage={canManageAccess}
            initialEnabled={organization.discordWebhookEnabled}
            initialConfigured={Boolean(organization.discordWebhookUrl)}
          />

          <OrganizationMembersPanel
            canManage={canManageAccess}
            members={currentMembers}
            invitations={invitations}
          />

          <Card className="overflow-hidden">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader>
              <CardTitle>Create another organization</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateOrganizationForm compact />
            </CardContent>
          </Card>

          <OrganizationMembershipsPanel
            currentOrganizationId={organization.id}
            memberships={memberships}
          />

          <OrganizationDangerZone canDelete={Boolean(canDeleteOrganization)} />
        </TabsContent>

        <TabsContent value="workspaces" className="space-y-4">
          <Card className="overflow-hidden">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader>
              <CardTitle>Create workspace</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateWorkspaceForm />
            </CardContent>
          </Card>

          <WorkspaceManagementPanel
            canManage={canManageWorkspaceSettings}
            currentWorkspaceId={organization.currentWorkspace?.id ?? null}
            workspaces={organization.workspaces}
          />
        </TabsContent>

        <TabsContent value="user" className="space-y-4">
          <AccountSecurityPanel />

          <Card className="overflow-hidden">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader>
              <CardTitle>Quick account access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Use the top-right user menu to update your profile image, language, settings, or sign out.</p>
              <p>Current account: {session?.user?.email ?? "N/A"}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
              <CardHeader>
                <CardTitle>{t("settings.authProviders")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{t("settings.googleLogin")}</p>
                    <Badge variant={hasGoogleLogin ? "default" : "secondary"}>
                      {hasGoogleLogin ? t("settings.enabled") : t("settings.disabled")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {hasGoogleLogin
                      ? t("settings.googleEnabledCopy")
                      : t("settings.googleDisabledCopy")}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{t("settings.discordLogin")}</p>
                    <Badge variant={hasDiscordLogin ? "default" : "secondary"}>
                      {hasDiscordLogin ? t("settings.enabled") : t("settings.disabled")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {hasDiscordLogin
                      ? t("settings.discordEnabledCopy")
                      : t("settings.discordDisabledCopy")}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{t("settings.appleLogin")}</p>
                    <Badge variant={hasAppleLogin ? "default" : "secondary"}>
                      {hasAppleLogin ? t("settings.enabled") : t("settings.disabled")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {hasAppleLogin
                      ? t("settings.appleEnabledCopy")
                      : t("settings.appleDisabledCopy")}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
              <CardHeader>
                <CardTitle>{t("settings.googleSheetsExport")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{t("settings.googleSheetsExport")}</p>
                    <Badge variant={hasGoogleSheets ? "default" : "secondary"}>
                      {hasGoogleSheets ? t("settings.enabled") : t("settings.disabled")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {hasGoogleSheets
                      ? t("settings.googleSheetsEnabledCopy")
                      : t("settings.googleSheetsDisabledCopy")}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
              <CardHeader>
                <CardTitle>Access summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                  <p className="font-medium">Primary organization</p>
                  <p className="mt-1 text-muted-foreground">{organization.name}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                  <p className="font-medium">Seat usage</p>
                  <p className="mt-1 text-muted-foreground">{seatLimitLabel}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <PrivacyPanel
            consents={privacyConsents.map((item) => ({
              purpose: item.purpose,
              consent: item.consent
                ? {
                    id: item.consent.id,
                    status: item.consent.status,
                    consentTextVersion: item.consent.consentTextVersion,
                    grantedAt: item.consent.grantedAt.toISOString(),
                    revokedAt: item.consent.revokedAt?.toISOString() ?? null
                  }
                : null
            }))}
            requests={privacyRequests.map((item) => ({
              id: item.id,
              requestType: item.requestType,
              status: item.status,
              reason: item.reason,
              dueAt: item.dueAt.toISOString(),
              createdAt: item.createdAt.toISOString(),
              completedAt: item.completedAt?.toISOString() ?? null
            }))}
            purposes={privacyPurposes}
            supportEmail={env.PRIVACY_SUPPORT_EMAIL ?? null}
            canAdmin={Boolean(canManageSubscription)}
            adminSnapshot={privacyAdminSnapshot}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

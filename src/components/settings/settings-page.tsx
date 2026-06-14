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
    let resolvedValue0: any;
  if (session?.user?.id) {
    resolvedValue0 = await db.organizationMember.findMany({
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
      });
  } else {
    resolvedValue0 = [];
  }
const memberships = resolvedValue0;
  const language = session?.user?.preferredLanguage ?? "en";
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(language, key, values);
  const currentMembership = memberships.find((membership: any) => membership.organizationId === organization.id);
  const canManageSubscription = currentMembership?.role === "OWNER" || currentMembership?.role === "ADMIN";
    let resolvedValue1: any;
  if (currentMembership) {
    resolvedValue1 = canManageOrganization(currentMembership.role, currentMembership.permissions);
  } else {
    resolvedValue1 = false;
  }
const canManageAccess = resolvedValue1;
    let resolvedValue2: any;
  if (currentMembership) {
    resolvedValue2 = canManageWorkspaces(currentMembership.role, currentMembership.permissions);
  } else {
    resolvedValue2 = false;
  }
const canManageWorkspaceSettings = resolvedValue2;
  const canDeleteOrganization = currentMembership?.role === "OWNER";
  const hasGoogleLogin = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const hasDiscordLogin = Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
  const hasAppleLogin = Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET);
  const hasGoogleSheets = Boolean(process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY);
    let resolvedValue3: any;
  if (subscriptionSnapshot.limits.seats === null) {
    resolvedValue3 = "Ilimitado";
  } else {
    resolvedValue3 = `${subscriptionSnapshot.usage.seats}/${subscriptionSnapshot.limits.seats}`;
  }
const seatLimitLabel = resolvedValue3;
  const privacyPurposes = listProcessingPurposes();
    let resolvedValue4: any;
  if (session?.user?.id) {
    resolvedValue4 = await listUserConsentState(session.user.id);
  } else {
    resolvedValue4 = [];
  }
const privacyConsents = resolvedValue4;
    let resolvedValue5: any;
  if (session?.user?.id) {
    resolvedValue5 = await listUserDataSubjectRequests(session.user.id);
  } else {
    resolvedValue5 = [];
  }
const privacyRequests = resolvedValue5;
    let resolvedValue6: any;
  if (canManageSubscription) {
    resolvedValue6 = await Promise.all([
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
        requests: adminRequests.map((item: any) => {
          let resolvedValue20: any;
          if (item.handledBy) {
            resolvedValue20 = {
                email: item.handledBy.email,
                name: item.handledBy.name
              };
          } else {
            resolvedValue20 = null;
          }
          return ({
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
          handledBy: resolvedValue20
        });
        }),
        products: adminProducts.map((item: any) => ({
          id: item.id,
          productName: item.productName,
          productType: item.productType,
          approvalStatus: item.approvalStatus,
          minimumCohortSize: item.minimumCohortSize,
          privacyRiskScore: item.privacyRiskScore
        })),
        incidents: adminIncidents.map((item: any) => ({
          id: item.id,
          severity: item.severity,
          status: item.status,
          discoveredAt: item.discoveredAt.toISOString()
        })),
        auditLogs: adminAuditLogs.map((item: any) => ({
          id: item.id,
          action: item.action,
          resourceType: item.resourceType,
          decision: item.decision,
          createdAt: item.createdAt.toISOString()
        }))
      }));
  } else {
    resolvedValue6 = null;
  }
const privacyAdminSnapshot = resolvedValue6;

    let resolvedValue7: any;
  if (hasGoogleLogin) {
    resolvedValue7 = "default";
  } else {
    resolvedValue7 = "secondary";
  }
  let resolvedValue8: any;
  if (hasGoogleLogin) {
    resolvedValue8 = t("settings.enabled");
  } else {
    resolvedValue8 = t("settings.disabled");
  }
  let resolvedValue9: any;
  if (hasGoogleLogin) {
    resolvedValue9 = t("settings.googleEnabledCopy");
  } else {
    resolvedValue9 = t("settings.googleDisabledCopy");
  }
  let resolvedValue10: any;
  if (hasDiscordLogin) {
    resolvedValue10 = "default";
  } else {
    resolvedValue10 = "secondary";
  }
  let resolvedValue11: any;
  if (hasDiscordLogin) {
    resolvedValue11 = t("settings.enabled");
  } else {
    resolvedValue11 = t("settings.disabled");
  }
  let resolvedValue12: any;
  if (hasDiscordLogin) {
    resolvedValue12 = t("settings.discordEnabledCopy");
  } else {
    resolvedValue12 = t("settings.discordDisabledCopy");
  }
  let resolvedValue13: any;
  if (hasAppleLogin) {
    resolvedValue13 = "default";
  } else {
    resolvedValue13 = "secondary";
  }
  let resolvedValue14: any;
  if (hasAppleLogin) {
    resolvedValue14 = t("settings.enabled");
  } else {
    resolvedValue14 = t("settings.disabled");
  }
  let resolvedValue15: any;
  if (hasAppleLogin) {
    resolvedValue15 = t("settings.appleEnabledCopy");
  } else {
    resolvedValue15 = t("settings.appleDisabledCopy");
  }
  let resolvedValue16: any;
  if (hasGoogleSheets) {
    resolvedValue16 = "default";
  } else {
    resolvedValue16 = "secondary";
  }
  let resolvedValue17: any;
  if (hasGoogleSheets) {
    resolvedValue17 = t("settings.enabled");
  } else {
    resolvedValue17 = t("settings.disabled");
  }
  let resolvedValue18: any;
  if (hasGoogleSheets) {
    resolvedValue18 = t("settings.googleSheetsEnabledCopy");
  } else {
    resolvedValue18 = t("settings.googleSheetsDisabledCopy");
  }
return (
    <div className="space-y-6">
      <PageHero
        title="Configurações"
        description="Gerencie acesso da conta, estrutura de áreas de trabalho, cobrança e integrações."
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
              <span className="text-muted-foreground">Assentos</span>
              <span className="font-medium">{seatLimitLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Organizações</span>
              <span className="font-medium">{memberships.length}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/35 p-3 dark:bg-white/[0.04]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Controle operacional</p>
              <p className="mt-2 font-medium">Acesso, propriedade, cobrança e configuração da organização.</p>
            </div>
          </div>
        )}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{subscriptionSnapshot.planLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">{organization.name}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Assentos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{seatLimitLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">Convites pendentes: {invitations.length}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Áreas de trabalho</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{organization.workspaces.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Espaços operacionais ativos</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Organizações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{memberships.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Organizações vinculadas a esta conta</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="organization" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-[1rem] border border-white/10 bg-white/55 p-1.5 backdrop-blur md:grid-cols-4 dark:bg-white/[0.04]">
          <TabsTrigger value="organization">Organização</TabsTrigger>
          <TabsTrigger value="workspaces">Áreas de trabalho</TabsTrigger>
          <TabsTrigger value="user">Conta</TabsTrigger>
          <TabsTrigger value="privacy">Privacidade</TabsTrigger>
        </TabsList>
        <p className="text-sm text-muted-foreground">
          Alterne entre configurações da organização, áreas de trabalho, segurança da conta e controles de privacidade.
        </p>

        <TabsContent value="organization" className="space-y-4">
          <Card className="overflow-hidden">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
            <CardHeader>
              <CardTitle>Organização atual</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Nome</p>
                <p className="mt-2 font-medium">{organization.name}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Slug</p>
                <p className="mt-2 font-medium">{organization.slug}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Assinatura</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-medium">{subscriptionSnapshot.planLabel}</span>
                  <Badge variant="secondary">{subscriptionSnapshot.status}</Badge>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Áreas de trabalho</p>
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
              <CardTitle>Criar outra organização</CardTitle>
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
              <CardTitle>Criar área de trabalho</CardTitle>
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
              <CardTitle>Acesso rápido da conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Use o menu do usuário no canto superior direito para atualizar sua imagem de perfil, idioma, configurações ou sair.</p>
              <p>Conta atual: {session?.user?.email ?? "N/A"}</p>
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
                    <Badge variant={resolvedValue7}>
                      {resolvedValue8}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {resolvedValue9}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{t("settings.discordLogin")}</p>
                    <Badge variant={resolvedValue10}>
                      {resolvedValue11}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {resolvedValue12}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{t("settings.appleLogin")}</p>
                    <Badge variant={resolvedValue13}>
                      {resolvedValue14}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {resolvedValue15}
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
                    <Badge variant={resolvedValue16}>
                      {resolvedValue17}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {resolvedValue18}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
              <CardHeader>
                <CardTitle>Resumo de acesso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                  <p className="font-medium">Organização principal</p>
                  <p className="mt-1 text-muted-foreground">{organization.name}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-white/[0.03]">
                  <p className="font-medium">Uso de assentos</p>
                  <p className="mt-1 text-muted-foreground">{seatLimitLabel}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <PrivacyPanel
            consents={privacyConsents.map((item: any) => {
              let resolvedValue19: any;
              if (item.consent) {
                resolvedValue19 = {
                    id: item.consent.id,
                    status: item.consent.status,
                    consentTextVersion: item.consent.consentTextVersion,
                    grantedAt: item.consent.grantedAt.toISOString(),
                    revokedAt: item.consent.revokedAt?.toISOString() ?? null
                  };
              } else {
                resolvedValue19 = null;
              }
              return ({
              purpose: item.purpose,
              consent: resolvedValue19
            });
            })}
            requests={privacyRequests.map((item: any) => ({
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

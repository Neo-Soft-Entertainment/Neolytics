import { OrganizationPermission, OrganizationRole } from "@prisma/client";

export const organizationPermissionOptions = [
  {
    value: OrganizationPermission.MANAGE_ORGANIZATION,
    label: "Manage organization",
    description: "Invite members, change organization settings, and manage integrations."
  },
  {
    value: OrganizationPermission.MANAGE_WORKSPACES,
    label: "Manage workspaces",
    description: "Create and update operating workspaces."
  },
  {
    value: OrganizationPermission.MANAGE_PROJECTS,
    label: "Manage projects",
    description: "Create projects, update boards, and run project workflows."
  },
  {
    value: OrganizationPermission.MANAGE_COMMERCE,
    label: "Manage commerce",
    description: "Manage sales channels, orders, payments, and fulfillment."
  },
  {
    value: OrganizationPermission.MANAGE_FINANCE,
    label: "Manage finance",
    description: "Work with budgets, revenue, expenses, invoices, and payables."
  },
  {
    value: OrganizationPermission.MANAGE_COMPANY,
    label: "Manage company",
    description: "Maintain legal entities, documents, compliance, and corporate records."
  },
  {
    value: OrganizationPermission.MANAGE_COMMUNITY,
    label: "Manage community",
    description: "Publish and moderate organization community activity."
  },
  {
    value: OrganizationPermission.MANAGE_PRIVACY,
    label: "Manage privacy",
    description: "Review privacy requests, incidents, data products, and audit logs."
  },
  {
    value: OrganizationPermission.EXPORT_DATA,
    label: "Export data",
    description: "Export reports, spreadsheets, and operating data."
  }
] as const;

export function getDefaultOrganizationPermissions(role: OrganizationRole) {
  if (role === OrganizationRole.OWNER || role === OrganizationRole.ADMIN) {
    return organizationPermissionOptions.map((option) => option.value);
  }

  if (role === OrganizationRole.MEMBER) {
    return [
      OrganizationPermission.MANAGE_PROJECTS,
      OrganizationPermission.MANAGE_COMMUNITY,
      OrganizationPermission.EXPORT_DATA
    ];
  }

  return [];
}

export function getOrganizationPermissionLabel(permission: OrganizationPermission) {
  return organizationPermissionOptions.find((option) => option.value === permission)?.label ?? permission;
}

export function hasOrganizationPermission(
  role: OrganizationRole,
  permissions: OrganizationPermission[],
  permission: OrganizationPermission
) {
  if (role === OrganizationRole.OWNER || role === OrganizationRole.ADMIN) {
    return true;
  }

  return permissions.includes(permission);
}

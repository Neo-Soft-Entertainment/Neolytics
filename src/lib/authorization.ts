import { OrganizationPermission, OrganizationRole } from "@prisma/client";

import { hasOrganizationPermission } from "@/lib/organization-permissions";

export function canWriteOrganization(role: OrganizationRole, permissions: OrganizationPermission[] = []) {
  return (
    role === OrganizationRole.OWNER ||
    role === OrganizationRole.ADMIN ||
    role === OrganizationRole.MEMBER ||
    hasOrganizationPermission(role, permissions, OrganizationPermission.MANAGE_PROJECTS) ||
    hasOrganizationPermission(role, permissions, OrganizationPermission.MANAGE_COMMUNITY)
  );
}

export function canManageOrganization(role: OrganizationRole, permissions: OrganizationPermission[] = []) {
  return hasOrganizationPermission(role, permissions, OrganizationPermission.MANAGE_ORGANIZATION);
}

export function canManageWorkspaces(role: OrganizationRole, permissions: OrganizationPermission[] = []) {
  return (
    role === OrganizationRole.OWNER ||
    role === OrganizationRole.ADMIN ||
    role === OrganizationRole.MEMBER ||
    hasOrganizationPermission(role, permissions, OrganizationPermission.MANAGE_WORKSPACES)
  );
}

export function canManageFinance(role: OrganizationRole, permissions: OrganizationPermission[] = []) {
  return hasOrganizationPermission(role, permissions, OrganizationPermission.MANAGE_FINANCE);
}

export function canManageCommerce(role: OrganizationRole, permissions: OrganizationPermission[] = []) {
  return hasOrganizationPermission(role, permissions, OrganizationPermission.MANAGE_COMMERCE);
}

export function canManageCompany(role: OrganizationRole, permissions: OrganizationPermission[] = []) {
  return hasOrganizationPermission(role, permissions, OrganizationPermission.MANAGE_COMPANY);
}

export function canManageCommunity(role: OrganizationRole, permissions: OrganizationPermission[] = []) {
  return hasOrganizationPermission(role, permissions, OrganizationPermission.MANAGE_COMMUNITY);
}

export function canManagePrivacy(role: OrganizationRole, permissions: OrganizationPermission[] = []) {
  return hasOrganizationPermission(role, permissions, OrganizationPermission.MANAGE_PRIVACY);
}

export function canExportData(role: OrganizationRole, permissions: OrganizationPermission[] = []) {
  return (
    role === OrganizationRole.OWNER ||
    role === OrganizationRole.ADMIN ||
    role === OrganizationRole.MEMBER ||
    hasOrganizationPermission(role, permissions, OrganizationPermission.EXPORT_DATA)
  );
}

import { OrganizationRole } from "@prisma/client";

export function canWriteOrganization(role: OrganizationRole) {
  return role === OrganizationRole.OWNER || role === OrganizationRole.ADMIN || role === OrganizationRole.MEMBER;
}

export function canManageOrganization(role: OrganizationRole) {
  return role === OrganizationRole.OWNER || role === OrganizationRole.ADMIN;
}

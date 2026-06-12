import { OrganizationRole } from "@prisma/client";

export type PrivacyPermission =
  | "view_raw_personal_data"
  | "export_reports"
  | "manage_consents"
  | "manage_data_products"
  | "review_privacy_requests"
  | "manage_privacy_incidents"
  | "view_privacy_audit_logs";

const rolePermissions: Record<OrganizationRole, PrivacyPermission[]> = {
  OWNER: [
    "view_raw_personal_data",
    "export_reports",
    "manage_consents",
    "manage_data_products",
    "review_privacy_requests",
    "manage_privacy_incidents",
    "view_privacy_audit_logs"
  ],
  ADMIN: [
    "view_raw_personal_data",
    "export_reports",
    "manage_consents",
    "manage_data_products",
    "review_privacy_requests",
    "manage_privacy_incidents",
    "view_privacy_audit_logs"
  ],
  MEMBER: ["export_reports"],
  VIEWER: []
};

export function getPrivacyPermissions(role: OrganizationRole) {
  return rolePermissions[role];
}

export function hasPrivacyPermission(role: OrganizationRole, permission: PrivacyPermission) {
  return getPrivacyPermissions(role).includes(permission);
}

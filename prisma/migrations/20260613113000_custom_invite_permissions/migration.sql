CREATE TYPE "OrganizationPermission" AS ENUM (
    'MANAGE_ORGANIZATION',
    'MANAGE_WORKSPACES',
    'MANAGE_PROJECTS',
    'MANAGE_FINANCE',
    'MANAGE_COMPANY',
    'MANAGE_COMMUNITY',
    'MANAGE_PRIVACY',
    'EXPORT_DATA'
);

ALTER TABLE "OrganizationMember"
ADD COLUMN "permissions" "OrganizationPermission"[] NOT NULL DEFAULT ARRAY[]::"OrganizationPermission"[];

ALTER TABLE "OrganizationInvitation"
ADD COLUMN "permissions" "OrganizationPermission"[] NOT NULL DEFAULT ARRAY[]::"OrganizationPermission"[];

ALTER TABLE "Organization"
ADD COLUMN "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'US';

ALTER TABLE "LegalEntity"
ALTER COLUMN "countryCode" SET DEFAULT 'US';

ALTER TABLE "LegalEntityBranch"
ALTER COLUMN "countryCode" SET DEFAULT 'US';

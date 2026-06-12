CREATE TABLE "ProjectArtAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'reference',
    "storagePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectArtAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectArtAsset_projectId_createdAt_idx" ON "ProjectArtAsset"("projectId", "createdAt" DESC);
CREATE INDEX "ProjectArtAsset_uploadedById_createdAt_idx" ON "ProjectArtAsset"("uploadedById", "createdAt" DESC);

ALTER TABLE "ProjectArtAsset" ADD CONSTRAINT "ProjectArtAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

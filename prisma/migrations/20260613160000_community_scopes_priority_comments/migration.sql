CREATE TYPE "CommunityPostScope" AS ENUM ('ORGANIZATION', 'GLOBAL');

CREATE TYPE "CommunityPostPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

ALTER TABLE "CommunityPost" ADD COLUMN "scope" "CommunityPostScope" NOT NULL DEFAULT 'ORGANIZATION';
ALTER TABLE "CommunityPost" ADD COLUMN "priority" "CommunityPostPriority" NOT NULL DEFAULT 'NORMAL';

CREATE TABLE "CommunityPostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityPostComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunityPost_scope_createdAt_idx" ON "CommunityPost"("scope", "createdAt" DESC);
CREATE INDEX "CommunityPostComment_postId_createdAt_idx" ON "CommunityPostComment"("postId", "createdAt" ASC);
CREATE INDEX "CommunityPostComment_organizationId_createdAt_idx" ON "CommunityPostComment"("organizationId", "createdAt" DESC);
CREATE INDEX "CommunityPostComment_authorId_createdAt_idx" ON "CommunityPostComment"("authorId", "createdAt" DESC);

ALTER TABLE "CommunityPostComment" ADD CONSTRAINT "CommunityPostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityPostComment" ADD CONSTRAINT "CommunityPostComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityPostComment" ADD CONSTRAINT "CommunityPostComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommunityPostComment" ENABLE ROW LEVEL SECURITY;

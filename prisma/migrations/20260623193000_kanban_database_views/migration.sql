-- CreateTable
CREATE TABLE "KanbanView" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layout" TEXT NOT NULL DEFAULT 'table',
    "groupBy" TEXT NOT NULL DEFAULT 'status',
    "sortBy" TEXT NOT NULL DEFAULT 'manual',
    "sortDirection" TEXT NOT NULL DEFAULT 'asc',
    "visibleProperties" JSONB,
    "filters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanbanView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KanbanView_boardId_createdAt_idx" ON "KanbanView"("boardId", "createdAt");

-- AddForeignKey
ALTER TABLE "KanbanView" ADD CONSTRAINT "KanbanView_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "KanbanBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

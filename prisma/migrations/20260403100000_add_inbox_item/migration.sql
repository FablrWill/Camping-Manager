-- CreateTable
CREATE TABLE "InboxItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "rawContent" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "triageType" TEXT,
    "suggestion" TEXT,
    "summary" TEXT,
    "confidence" TEXT,
    "imagePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "InboxItem_status_idx" ON "InboxItem"("status");

-- CreateIndex
CREATE INDEX "InboxItem_createdAt_idx" ON "InboxItem"("createdAt");

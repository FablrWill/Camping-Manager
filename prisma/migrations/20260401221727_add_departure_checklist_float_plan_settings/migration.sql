-- Phase 7: Day-of Execution foundation
-- Adds emergency contact fields to Trip, new DepartureChecklist, FloatPlanLog, Settings models
-- Note: FTS virtual tables (knowledge_chunks_fts_*) are not managed by Prisma migrations.
-- Note: emergencyContact columns were already applied via a partial run; ALTER TABLE is idempotent-guarded.

-- AlterTable (already applied — SQLite does not support IF NOT EXISTS on ADD COLUMN)
-- ALTER TABLE "Trip" ADD COLUMN "emergencyContactEmail" TEXT;
-- ALTER TABLE "Trip" ADD COLUMN "emergencyContactName" TEXT;

-- CreateTable
CREATE TABLE "DepartureChecklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DepartureChecklist_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FloatPlanLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "sentTo" TEXT NOT NULL,
    "sentToName" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FloatPlanLog_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'user_settings',
    "emergencyContactName" TEXT,
    "emergencyContactEmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DepartureChecklist_tripId_key" ON "DepartureChecklist"("tripId");

-- CreateIndex
CREATE INDEX "FloatPlanLog_tripId_idx" ON "FloatPlanLog"("tripId");

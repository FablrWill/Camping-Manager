-- Phase 36: Agent Jobs Infrastructure + KitPreset (missing from prior migrations)

CREATE TABLE "AgentJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "triggeredBy" TEXT NOT NULL DEFAULT 'manual',
    "payload" TEXT NOT NULL,
    "result" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

CREATE INDEX "AgentJob_status_idx" ON "AgentJob"("status");
CREATE INDEX "AgentJob_createdAt_idx" ON "AgentJob"("createdAt");

-- Camp Kit Presets

CREATE TABLE "KitPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "gearIds" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

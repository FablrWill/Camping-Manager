-- Phase 6 Stabilization: Schema additions
-- D-01: Trip packing list persistence columns
-- D-05/D-10: MealPlan model (one per trip)
-- D-08: PackingItem usage status
-- D-09: TripFeedback model (append-only)
-- D-11: cachedAt timestamps on Trip, PackingItem, MealPlan

-- Add columns to PackingItem
ALTER TABLE "PackingItem" ADD COLUMN "usageStatus" TEXT;
ALTER TABLE "PackingItem" ADD COLUMN "cachedAt" DATETIME;

-- Add columns to Trip
ALTER TABLE "Trip" ADD COLUMN "packingListResult" TEXT;
ALTER TABLE "Trip" ADD COLUMN "packingListGeneratedAt" DATETIME;
ALTER TABLE "Trip" ADD COLUMN "cachedAt" DATETIME;

-- Create MealPlan table (one per trip via @unique on tripId)
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cachedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MealPlan_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MealPlan_tripId_key" ON "MealPlan"("tripId");

-- Create TripFeedback table (append-only, multiple per trip)
CREATE TABLE "TripFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "summary" TEXT,
    "voiceTranscript" TEXT,
    "insights" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripFeedback_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TripFeedback_tripId_idx" ON "TripFeedback"("tripId");

-- Phase 40: Add Trail model for GPX trail overlay feature

CREATE TABLE "Trail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceFile" TEXT,
    "geoJson" TEXT NOT NULL,
    "distanceKm" REAL,
    "elevationGainM" REAL,
    "locationId" TEXT,
    "color" TEXT NOT NULL DEFAULT '#22c55e',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trail_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Trail_locationId_idx" ON "Trail"("locationId");
CREATE INDEX "Trail_createdAt_idx" ON "Trail"("createdAt");

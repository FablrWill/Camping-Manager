-- CreateTable
CREATE TABLE "TimelinePoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "altitude" REAL,
    "timestamp" DATETIME NOT NULL,
    "timestampMs" BIGINT NOT NULL,
    "accuracy" INTEGER,
    "activityType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PlaceVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "startTimestamp" DATETIME NOT NULL,
    "endTimestamp" DATETIME NOT NULL,
    "startMs" BIGINT NOT NULL,
    "endMs" BIGINT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ActivitySegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityType" TEXT NOT NULL,
    "startLat" REAL NOT NULL,
    "startLon" REAL NOT NULL,
    "endLat" REAL NOT NULL,
    "endLon" REAL NOT NULL,
    "startTimestamp" DATETIME NOT NULL,
    "endTimestamp" DATETIME NOT NULL,
    "startMs" BIGINT NOT NULL,
    "endMs" BIGINT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "distanceMeters" INTEGER,
    "waypoints" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "altitude" REAL,
    "takenAt" DATETIME,
    "imagePath" TEXT NOT NULL,
    "locationId" TEXT,
    "tripId" TEXT,
    "locationSource" TEXT,
    "locationDescription" TEXT,
    "locationConfidence" TEXT,
    "visionApproximate" BOOLEAN NOT NULL DEFAULT false,
    "googleUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Photo_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Photo_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Photo" ("altitude", "createdAt", "id", "imagePath", "latitude", "locationId", "longitude", "notes", "takenAt", "title", "tripId", "updatedAt") SELECT "altitude", "createdAt", "id", "imagePath", "latitude", "locationId", "longitude", "notes", "takenAt", "title", "tripId", "updatedAt" FROM "Photo";
DROP TABLE "Photo";
ALTER TABLE "new_Photo" RENAME TO "Photo";
CREATE INDEX "Photo_locationId_idx" ON "Photo"("locationId");
CREATE INDEX "Photo_tripId_idx" ON "Photo"("tripId");
CREATE INDEX "Photo_takenAt_idx" ON "Photo"("takenAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TimelinePoint_timestamp_idx" ON "TimelinePoint"("timestamp");

-- CreateIndex
CREATE INDEX "TimelinePoint_timestampMs_idx" ON "TimelinePoint"("timestampMs");

-- CreateIndex
CREATE INDEX "PlaceVisit_startTimestamp_idx" ON "PlaceVisit"("startTimestamp");

-- CreateIndex
CREATE INDEX "PlaceVisit_startMs_idx" ON "PlaceVisit"("startMs");

-- CreateIndex
CREATE INDEX "ActivitySegment_startTimestamp_idx" ON "ActivitySegment"("startTimestamp");

-- CreateIndex
CREATE INDEX "ActivitySegment_startMs_idx" ON "ActivitySegment"("startMs");

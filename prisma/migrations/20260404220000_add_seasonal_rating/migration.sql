-- CreateTable
CREATE TABLE "SeasonalRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SeasonalRating_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SeasonalRating_locationId_season_key" ON "SeasonalRating"("locationId", "season");

-- CreateIndex
CREATE INDEX "SeasonalRating_locationId_idx" ON "SeasonalRating"("locationId");

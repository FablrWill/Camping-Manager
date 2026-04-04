-- CreateTable
CREATE TABLE "SignalLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "carrier" TEXT,
    "cellBars" INTEGER,
    "cellType" TEXT,
    "signalStrength" INTEGER,
    "starlinkQuality" TEXT,
    "speedDown" REAL,
    "speedUp" REAL,
    "notes" TEXT,
    "loggedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SignalLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SignalLog_locationId_idx" ON "SignalLog"("locationId");

-- CreateIndex
CREATE INDEX "SignalLog_loggedAt_idx" ON "SignalLog"("loggedAt");

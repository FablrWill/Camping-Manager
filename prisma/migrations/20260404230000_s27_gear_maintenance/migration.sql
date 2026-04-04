-- S27: Gear Maintenance Reminders
-- Add maintenance tracking fields to GearItem
ALTER TABLE "GearItem" ADD COLUMN "lastMaintenanceAt" DATETIME;
ALTER TABLE "GearItem" ADD COLUMN "maintenanceIntervalDays" INTEGER;

-- Create GearMaintenanceLog model
CREATE TABLE "GearMaintenanceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gearItemId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "notes" TEXT,
    "loggedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GearMaintenanceLog_gearItemId_fkey" FOREIGN KEY ("gearItemId") REFERENCES "GearItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "GearMaintenanceLog_gearItemId_idx" ON "GearMaintenanceLog"("gearItemId");

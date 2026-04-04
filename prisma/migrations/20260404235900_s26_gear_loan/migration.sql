-- S26: Gear Lending Tracker
-- Create GearLoan model
CREATE TABLE "GearLoan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gearItemId" TEXT NOT NULL,
    "borrowerName" TEXT NOT NULL,
    "lentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GearLoan_gearItemId_fkey" FOREIGN KEY ("gearItemId") REFERENCES "GearItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "GearLoan_gearItemId_idx" ON "GearLoan"("gearItemId");
CREATE INDEX "GearLoan_returnedAt_idx" ON "GearLoan"("returnedAt");

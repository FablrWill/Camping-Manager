-- Phase 32: Add targetPrice to GearItem and create GearPriceCheck table

ALTER TABLE "GearItem" ADD COLUMN "targetPrice" REAL;

CREATE TABLE "GearPriceCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gearItemId" TEXT NOT NULL UNIQUE,
    "foundPriceRange" TEXT NOT NULL,
    "foundPriceLow" REAL NOT NULL,
    "retailers" TEXT NOT NULL DEFAULT '[]',
    "disclaimer" TEXT NOT NULL,
    "isAtOrBelowTarget" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GearPriceCheck_gearItemId_fkey" FOREIGN KEY ("gearItemId") REFERENCES "GearItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

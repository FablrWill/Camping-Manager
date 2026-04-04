-- AlterTable: add targetPrice to GearItem
ALTER TABLE "GearItem" ADD COLUMN "targetPrice" REAL;

-- CreateTable
CREATE TABLE "GearPriceCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gearItemId" TEXT NOT NULL,
    "foundPriceRange" TEXT NOT NULL,
    "foundPriceLow" REAL NOT NULL,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAtOrBelowTarget" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GearPriceCheck_gearItemId_fkey" FOREIGN KEY ("gearItemId") REFERENCES "GearItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GearPriceCheck_gearItemId_key" ON "GearPriceCheck"("gearItemId");

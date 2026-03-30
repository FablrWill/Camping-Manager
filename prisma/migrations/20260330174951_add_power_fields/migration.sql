-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "batteryUpdatedAt" DATETIME;
ALTER TABLE "Trip" ADD COLUMN "currentBatteryPct" REAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GearItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "condition" TEXT,
    "weight" REAL,
    "photoUrl" TEXT,
    "storageLocation" TEXT,
    "isWishlist" BOOLEAN NOT NULL DEFAULT false,
    "purchaseUrl" TEXT,
    "price" REAL,
    "notes" TEXT,
    "wattage" REAL,
    "hoursPerDay" REAL,
    "hasBattery" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_GearItem" ("brand", "category", "condition", "createdAt", "description", "id", "isWishlist", "name", "notes", "photoUrl", "price", "purchaseUrl", "storageLocation", "updatedAt", "weight") SELECT "brand", "category", "condition", "createdAt", "description", "id", "isWishlist", "name", "notes", "photoUrl", "price", "purchaseUrl", "storageLocation", "updatedAt", "weight" FROM "GearItem";
DROP TABLE "GearItem";
ALTER TABLE "new_GearItem" RENAME TO "GearItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

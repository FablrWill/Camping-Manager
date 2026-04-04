-- CreateTable
CREATE TABLE "GearDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gearItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "localPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GearDocument_gearItemId_fkey" FOREIGN KEY ("gearItemId") REFERENCES "GearItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GearDocument_gearItemId_idx" ON "GearDocument"("gearItemId");

-- Migrate existing manualUrl values to GearDocument rows (per D-01, D-02)
INSERT INTO "GearDocument" ("id", "gearItemId", "type", "url", "title", "createdAt")
SELECT
  lower(hex(randomblob(16))),
  "id",
  'support_link',
  "manualUrl",
  'Manual',
  CURRENT_TIMESTAMP
FROM "GearItem"
WHERE "manualUrl" IS NOT NULL AND "manualUrl" != '';

-- DropColumn (SQLite 3.35+ supports DROP COLUMN)
ALTER TABLE "GearItem" DROP COLUMN "manualUrl";

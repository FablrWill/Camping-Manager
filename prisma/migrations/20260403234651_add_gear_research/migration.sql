-- CreateTable
CREATE TABLE "GearResearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gearItemId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "researchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GearResearch_gearItemId_fkey" FOREIGN KEY ("gearItemId") REFERENCES "GearItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GearResearch_gearItemId_key" ON "GearResearch"("gearItemId");

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "dosesPerDay" REAL NOT NULL,
    "unitsPerDose" REAL NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'pill',
    "isForDog" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

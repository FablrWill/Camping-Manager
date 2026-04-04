-- CreateTable
CREATE TABLE "CampingProfile" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "reportJson" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

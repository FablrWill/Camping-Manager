-- S28: Add shareToken to Trip for shareable trip reports
ALTER TABLE "Trip" ADD COLUMN "shareToken" TEXT;
CREATE UNIQUE INDEX "Trip_shareToken_key" ON "Trip"("shareToken");

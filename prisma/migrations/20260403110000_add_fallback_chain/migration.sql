-- Phase 22: Add fallback chain fields to Trip model
ALTER TABLE "Trip" ADD COLUMN "fallbackFor" TEXT;
ALTER TABLE "Trip" ADD COLUMN "fallbackOrder" INTEGER;

-- Index for efficient lookups of alternatives by primary trip
CREATE INDEX "Trip_fallbackFor_idx" ON "Trip"("fallbackFor");

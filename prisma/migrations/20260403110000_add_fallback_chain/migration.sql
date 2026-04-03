-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "fallbackFor" TEXT;
ALTER TABLE "Trip" ADD COLUMN "fallbackOrder" INTEGER;

-- Index for efficient lookup (Phase 22: fallback chain)
CREATE INDEX "Trip_fallbackFor_idx" ON "Trip"("fallbackFor");

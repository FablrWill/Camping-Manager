-- Phase 19: Dog-aware trip planning
-- Adds bringingDog boolean to Trip model to enable dog-aware packing list generation

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "bringingDog" BOOLEAN NOT NULL DEFAULT false;

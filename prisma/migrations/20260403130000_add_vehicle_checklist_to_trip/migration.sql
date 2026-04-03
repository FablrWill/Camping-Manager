-- Phase 29: Add vehicle checklist fields to Trip model
ALTER TABLE "Trip" ADD COLUMN "vehicleChecklistResult" TEXT;
ALTER TABLE "Trip" ADD COLUMN "vehicleChecklistGeneratedAt" DATETIME;

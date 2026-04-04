-- Phase 7: Add emergency contact fields to Trip (were commented out in prior migration)
-- These columns existed in production but were omitted from migration SQL for a fresh DB
ALTER TABLE "Trip" ADD COLUMN "emergencyContactName" TEXT;
ALTER TABLE "Trip" ADD COLUMN "emergencyContactEmail" TEXT;

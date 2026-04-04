-- Phase 25/32: Add researchResult and researchedAt to GearItem
-- These fields support the Gear Docs Manual Finder (Phase 25) and research features
ALTER TABLE "GearItem" ADD COLUMN "researchResult" TEXT;
ALTER TABLE "GearItem" ADD COLUMN "researchedAt" DATETIME;

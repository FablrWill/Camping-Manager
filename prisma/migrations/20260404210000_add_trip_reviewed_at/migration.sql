-- Migration: add_trip_reviewed_at
-- Phase 38: Post-Trip Auto-Review

-- Add reviewedAt nullable DateTime to Trip
ALTER TABLE "Trip" ADD COLUMN "reviewedAt" DATETIME;

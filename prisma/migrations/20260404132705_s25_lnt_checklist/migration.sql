-- S25: Add LNT checklist fields to Trip

ALTER TABLE "Trip" ADD COLUMN "lntChecklistResult" TEXT;
ALTER TABLE "Trip" ADD COLUMN "lntChecklistGeneratedAt" DATETIME;

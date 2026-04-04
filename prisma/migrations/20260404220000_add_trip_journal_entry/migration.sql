-- S20: Voice Ghostwriter — add journal entry fields to Trip
ALTER TABLE "Trip" ADD COLUMN "journalEntry" TEXT;
ALTER TABLE "Trip" ADD COLUMN "journalEntryAt" DATETIME;

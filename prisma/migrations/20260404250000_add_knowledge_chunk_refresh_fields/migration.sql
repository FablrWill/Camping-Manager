-- S36: Add contentHash and refreshedAt to KnowledgeChunk for change-based refresh
ALTER TABLE "KnowledgeChunk" ADD COLUMN "contentHash" TEXT;
ALTER TABLE "KnowledgeChunk" ADD COLUMN "refreshedAt" DATETIME;

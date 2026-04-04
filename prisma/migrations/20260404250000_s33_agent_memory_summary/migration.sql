-- S33: Add summary and createdAt fields to AgentMemory
-- summary: rolling AI-condensed digest of all memory entries (< 500 tokens)
-- createdAt: when the record was first inserted (updatedAt already tracked by Prisma)

ALTER TABLE "AgentMemory" ADD COLUMN "summary" TEXT;
ALTER TABLE "AgentMemory" ADD COLUMN "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

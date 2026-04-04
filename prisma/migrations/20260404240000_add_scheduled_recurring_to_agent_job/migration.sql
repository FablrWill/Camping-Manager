-- AlterTable: Add scheduledFor and recurringCron to AgentJob
ALTER TABLE "AgentJob" ADD COLUMN "scheduledFor" DATETIME;
ALTER TABLE "AgentJob" ADD COLUMN "recurringCron" TEXT;

-- CreateIndex
CREATE INDEX "AgentJob_scheduledFor_idx" ON "AgentJob"("scheduledFor");

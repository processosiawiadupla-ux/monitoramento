-- CreateEnum
CREATE TYPE "RuleTrigger" AS ENUM ('FIRST_REPLY', 'INBOUND_KEYWORD', 'OUTBOUND_KEYWORD');

-- AlterTable
ALTER TABLE "StageChange" ADD COLUMN     "reason" TEXT;

-- CreateTable
CREATE TABLE "StageRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "RuleTrigger" NOT NULL,
    "keywords" TEXT[],
    "toStageId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StageRule_organizationId_idx" ON "StageRule"("organizationId");

-- AddForeignKey
ALTER TABLE "StageRule" ADD CONSTRAINT "StageRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageRule" ADD CONSTRAINT "StageRule_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

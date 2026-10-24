-- CreateEnum
CREATE TYPE "OrganizerEmailStatus" AS ENUM ('PENDING', 'SENDING', 'ACCEPTED', 'FAILED', 'UNCERTAIN', 'SUPERSEDED');

-- AlterTable
ALTER TABLE "OrganizerProfile" ADD COLUMN     "decisionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "OrganizerDecision" (
    "id" UUID NOT NULL,
    "organizerProfileId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "previousStatus" "OrganizerStatus" NOT NULL,
    "resultingStatus" "OrganizerStatus" NOT NULL,
    "reason" TEXT,
    "version" INTEGER NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizerDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizerDecisionNotification" (
    "id" UUID NOT NULL,
    "decisionId" UUID NOT NULL,
    "status" "OrganizerEmailStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "claimedAt" TIMESTAMP(3),
    "attemptedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizerDecisionNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizerDecision_actorId_idx" ON "OrganizerDecision"("actorId");

-- CreateIndex
CREATE INDEX "OrganizerDecision_decidedAt_idx" ON "OrganizerDecision"("decidedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizerDecision_organizerProfileId_version_key" ON "OrganizerDecision"("organizerProfileId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizerDecisionNotification_decisionId_key" ON "OrganizerDecisionNotification"("decisionId");

-- AddForeignKey
ALTER TABLE "OrganizerDecision" ADD CONSTRAINT "OrganizerDecision_organizerProfileId_fkey" FOREIGN KEY ("organizerProfileId") REFERENCES "OrganizerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizerDecision" ADD CONSTRAINT "OrganizerDecision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizerDecisionNotification" ADD CONSTRAINT "OrganizerDecisionNotification_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "OrganizerDecision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrganizerProfile"
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "payoutBankName" TEXT,
  ADD COLUMN "payoutAccountEncrypted" TEXT,
  ADD COLUMN "payoutAccountLast4" TEXT;

ALTER TYPE "EventType" ADD VALUE 'CONFERENCE';
ALTER TYPE "EventType" ADD VALUE 'SPORTS';
ALTER TYPE "EventType" ADD VALUE 'THEATER';

CREATE INDEX "Event_organizerId_status_idx" ON "Event"("organizerId", "status");
CREATE INDEX "TicketVerification_verifiedById_verifiedAt_idx" ON "TicketVerification"("verifiedById", "verifiedAt");

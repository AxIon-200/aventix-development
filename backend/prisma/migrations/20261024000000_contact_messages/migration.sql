-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" UUID NOT NULL,
    "attendeeId" UUID NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "subject" VARCHAR(150) NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactMessage_attendeeId_createdAt_idx" ON "ContactMessage"("attendeeId", "createdAt");

-- CreateIndex
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

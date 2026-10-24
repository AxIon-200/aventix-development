CREATE TABLE "OrganizerApplication" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizerProfileId" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "organizationName" TEXT NOT NULL,
    "organizationDescription" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizerApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizerApplication_userId_key" ON "OrganizerApplication"("userId");
CREATE UNIQUE INDEX "OrganizerApplication_organizerProfileId_key" ON "OrganizerApplication"("organizerProfileId");
ALTER TABLE "OrganizerApplication" ADD CONSTRAINT "OrganizerApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizerApplication" ADD CONSTRAINT "OrganizerApplication_organizerProfileId_fkey" FOREIGN KEY ("organizerProfileId") REFERENCES "OrganizerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

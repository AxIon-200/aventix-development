-- No account backfill: preserve existing consent, verification and credentials.
ALTER TABLE "user" ADD COLUMN "lifecycleLock" TEXT NOT NULL DEFAULT '';
-- The read-only preflight must find zero normalized collisions before applying.
CREATE UNIQUE INDEX "user_normalized_email_key" ON "user" (lower(btrim("email")));

CREATE TABLE "auth_link" (
  "id" UUID PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "purpose" TEXT NOT NULL,
  "digest" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3)
);
CREATE INDEX "auth_link_userId_purpose_idx" ON "auth_link"("userId", "purpose");
CREATE TABLE "email_cooldown" (
  "id" UUID PRIMARY KEY,
  "email" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "attemptedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_cooldown_email_purpose_key" UNIQUE ("email", "purpose")
);
CREATE TABLE "auth_rate_limit" (
  "id" TEXT PRIMARY KEY,
  "count" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);

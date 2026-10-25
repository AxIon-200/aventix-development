CREATE TABLE "AdminPreferences" (
    "userId" UUID NOT NULL,
    "settings" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminPreferences_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "AdminPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

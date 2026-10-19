import "../test/setup.js";
import { prisma } from "../src/lib/prisma.js";

// Match JavaScript's surrounding trim, including its Unicode whitespace.
const whitespace = "\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff";

// Read-only inventory for the identity-verified dedicated test database. Never
// print connection values, account identities, credential contents or tokens.
try {
  const marker = await prisma.$queryRaw<Array<{ environment: string }>>`
    SELECT environment FROM public.test_environment_marker WHERE id = 1
  `;
  if (marker[0]?.environment !== "aventix-test") throw new Error("Test marker mismatch");

  const [inventory] = await prisma.$queryRaw<Array<{
    accounts: number;
    noncanonicalEmails: number;
    invalidAccountStates: number;
    malformedNames: number;
    partialConsent: number;
    missingConsent: number;
    unverifiedAccounts: number;
  }>>`
    SELECT count(*)::int AS accounts,
      count(*) FILTER (WHERE email <> lower(btrim(email, ${whitespace})))::int AS "noncanonicalEmails",
      count(*) FILTER (WHERE role NOT IN ('ATTENDEE', 'ORGANIZER', 'ADMINISTRATOR')
        OR status NOT IN ('ACTIVE', 'DISABLED'))::int AS "invalidAccountStates",
      count(*) FILTER (WHERE char_length(btrim("firstName", ${whitespace})) NOT BETWEEN 1 AND 100
        OR char_length(btrim("lastName", ${whitespace})) NOT BETWEEN 1 AND 100)::int AS "malformedNames",
      count(*) FILTER (WHERE ("termsVersion" IS NULL) <> ("termsAcceptedAt" IS NULL))::int AS "partialConsent",
      count(*) FILTER (WHERE "termsVersion" IS NULL AND "termsAcceptedAt" IS NULL)::int AS "missingConsent",
      count(*) FILTER (WHERE NOT "emailVerified")::int AS "unverifiedAccounts"
    FROM public."user"
  `;
  const [collisions] = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT count(*)::int AS count FROM (
      SELECT normalized.email FROM (
        SELECT lower(btrim(email, ${whitespace})) AS email FROM public."user"
      ) normalized GROUP BY normalized.email HAVING count(*) > 1
    ) collisions
  `;
  const [credentials] = await prisma.$queryRaw<Array<{ legacyCredentials: number }>>`
    SELECT count(*)::int AS "legacyCredentials" FROM public.account
    WHERE "providerId" = 'credential' AND password IS NOT NULL
      AND password NOT LIKE 'aventix-scrypt-v1$%'
  `;
  console.log(JSON.stringify({ markerVerified: true, inventory,
    normalizedCollisionGroups: collisions?.count, ...credentials }));
  if (!inventory || collisions?.count !== 0 || inventory.noncanonicalEmails > 0
    || inventory.invalidAccountStates > 0 || inventory.malformedNames > 0 || inventory.partialConsent > 0) {
    throw new Error("Inventory requires owner review");
  }
} catch {
  console.error("Registration preflight failed; no changes applied. Review the test database configuration and aggregate inventory.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

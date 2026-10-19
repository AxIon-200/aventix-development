import "../test/setup.js";
import { prisma } from "../src/lib/prisma.js";
try {
  const marker = await prisma.$queryRaw<Array<{environment: string}>>`SELECT environment FROM public.test_environment_marker WHERE id = 1`;
  if (marker[0]?.environment !== "aventix-test") throw new Error("Test marker mismatch");
  const counts = await prisma.$queryRaw`
    SELECT count(*)::int AS accounts,
      count(*) FILTER (WHERE email <> lower(btrim(email)))::int AS noncanonical_emails,
      count(*) FILTER (WHERE role NOT IN ('ATTENDEE','ORGANIZER','ADMINISTRATOR') OR status NOT IN ('ACTIVE','DISABLED'))::int AS invalid_account_states,
      count(*) FILTER (WHERE "termsVersion" IS NULL OR "termsAcceptedAt" IS NULL)::int AS missing_consent,
      count(*) FILTER (WHERE "emailVerified" = false)::int AS unverified_accounts
    FROM public."user"`;
  const collisions = await prisma.$queryRaw<Array<{count: number}>>`SELECT count(*)::int AS count FROM (SELECT lower(btrim(email)) FROM public."user" GROUP BY lower(btrim(email)) HAVING count(*) > 1) c`;
  console.log(JSON.stringify({ markerVerified: true, counts, normalizedCollisionGroups: collisions[0]?.count }));
  if (collisions[0]?.count !== 0) process.exitCode = 1;
} catch { console.error("Database preflight failed; no changes applied"); process.exitCode = 1; }
finally { await prisma.$disconnect(); }

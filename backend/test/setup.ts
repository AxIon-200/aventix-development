import { config } from "dotenv";

config({
  path: ".env.test",
  override: true,
});

// 1. Verify test environment
if (process.env.NODE_ENV !== "test") {
  throw new Error("Tests must run with NODE_ENV=test");
}

// 2. Verify required environment variables
const databaseUrl = process.env.DATABASE_URL;
const developmentUrl = process.env.DEV_DATABASE_URL;
const testProjectRef = process.env.TEST_DATABASE_PROJECT_REF;

if (!databaseUrl || !developmentUrl || !testProjectRef) {
  throw new Error(
    "Missing DATABASE_URL, DEV_DATABASE_URL, or TEST_DATABASE_PROJECT_REF",
  );
}

// 3. Ensure test and development URLs differ
if (databaseUrl === developmentUrl) {
  throw new Error(
    "Test database must be different from development database",
  );
}

// 4. Verify Supabase test project identity
const parsedUrl = new URL(databaseUrl);

const connectionIdentity =
  `${parsedUrl.hostname} ${decodeURIComponent(parsedUrl.username)}`;

if (!connectionIdentity.includes(testProjectRef)) {
  throw new Error(
    "DATABASE_URL does not match the expected Supabase test project",
  );
}

// 5. All configuration checks passed
// A project reference alone does not prevent tests from writing to a project
// that has since been repurposed for a public demonstration.
const { PrismaPg } = await import("@prisma/adapter-pg");
const { PrismaClient } = await import("../src/generated/prisma/client.js");
const markerClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
try {
  const marker = await markerClient.$queryRaw<Array<{ environment: string }>>`
    SELECT environment FROM public.test_environment_marker WHERE id = 1`;
  if (marker[0]?.environment !== "aventix-test") {
    throw new Error("Database is no longer marked for tests");
  }
} catch {
  throw new Error("Dedicated test database marker could not be verified");
} finally {
  await markerClient.$disconnect();
}
console.log("Test database environment and marker verified");

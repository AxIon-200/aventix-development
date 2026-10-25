import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import pg from "pg";

const connection = process.env.DATABASE_URL;
const target = new URL(connection);
assert(process.env.TEST_DATABASE_PROJECT_REF, "Expected test project is required");
assert(`${target.hostname} ${decodeURIComponent(target.username)}`.includes(process.env.TEST_DATABASE_PROJECT_REF), "Unexpected database project");
assert.notEqual(connection, process.env.DEV_DATABASE_URL, "Test and development database must differ");
const client = new pg.Client({ connectionString: connection });
await client.connect();
try {
  const result = await client.query("SELECT environment FROM public.test_environment_marker WHERE id = 1");
  assert.equal(result.rows[0]?.environment, "aventix-test");
  console.log("Verified dedicated test database marker and project identity.");
} finally { await client.end(); }
execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { stdio: "inherit" });

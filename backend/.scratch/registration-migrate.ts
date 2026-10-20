import "../test/setup.js";
import { prisma } from "../src/lib/prisma.js";
import { readFile } from "node:fs/promises";
try {
  const marker = await prisma.$queryRaw<Array<{environment: string}>>`SELECT environment FROM public.test_environment_marker WHERE id = 1`;
  if (marker[0]?.environment !== "aventix-test") throw new Error("Wrong target");
  const collisions = await prisma.$queryRaw<Array<{count: number}>>`SELECT count(*)::int AS count FROM (SELECT lower(btrim(email)) FROM public."user" GROUP BY lower(btrim(email)) HAVING count(*) > 1) c`;
  if (collisions[0]?.count !== 0) throw new Error("Normalized collisions");
  const sql = await readFile("prisma/migrations/20261019000000_registration/migration.sql", "utf8");
  await prisma.$transaction(async tx => {
    for (const statement of sql.replace(/--[^\n]*/g, "").split(";").filter(value => value.trim())) {
      await tx.$executeRawUnsafe(statement);
    }
  });
  console.log("Registration migration applied atomically to the verified test database");
} catch { console.error("Migration failed; transaction rolled back"); process.exitCode = 1; }
finally { await prisma.$disconnect(); }

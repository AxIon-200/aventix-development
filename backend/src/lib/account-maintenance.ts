import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "./prisma.js";
import { env } from "../config/env.js";
import { hashExactPassword } from "./exact-password.js";
import { profileName } from "./profile-input.js";

export class AccountCommandError extends Error {}
export interface MaintenanceTarget {
  expectedProjectRef: string;
  operator: string;
}

const administratorInput = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  firstName: profileName, lastName: profileName,
  password: z.string().refine(value => value.isWellFormed() && [...value].length >= 15 && [...value].length <= 128),
}).strict();

export async function verifyMaintenanceTarget(target: MaintenanceTarget) {
  if (!/^[a-z0-9]{20}$/.test(target.expectedProjectRef) || !target.operator.trim()) {
    throw new AccountCommandError("Expected project reference and developer identity are required");
  }
  const url = new URL(env.DATABASE_URL);
  const direct = url.hostname === `db.${target.expectedProjectRef}.supabase.co` && decodeURIComponent(url.username) === "postgres";
  const pooled = /^[a-z0-9.-]+\.pooler\.supabase\.com$/.test(url.hostname)
    && decodeURIComponent(url.username) === `postgres.${target.expectedProjectRef}`;
  // node-postgres gives query parameters precedence over URL authority fields.
  const overridesIdentity = [...url.searchParams.keys()].some(key =>
    ["host", "hostaddr", "port", "user", "password", "database", "dbname", "service", "options"].includes(key.toLowerCase()));
  if (!["postgres:", "postgresql:"].includes(url.protocol) || (!direct && !pooled) || url.pathname !== "/postgres" || overridesIdentity) {
    throw new AccountCommandError("Database does not match the confirmed Supabase project");
  }
  // Verify a live connection before any mutation, never print its credentials.
  const result = await prisma.$queryRaw<Array<{ database: string }>>`SELECT current_database() AS database`;
  if (result[0]?.database !== "postgres") throw new AccountCommandError("Unexpected target database");
  if (env.NODE_ENV === "test") {
    if (target.expectedProjectRef !== process.env.TEST_DATABASE_PROJECT_REF || env.DATABASE_URL === process.env.DEV_DATABASE_URL) {
      throw new AccountCommandError("Test database identity mismatch");
    }
    const marker = await prisma.$queryRaw<Array<{ environment: string }>>`
      SELECT environment FROM public.test_environment_marker WHERE id = 1
    `;
    if (marker[0]?.environment !== "aventix-test") throw new AccountCommandError("Test database marker mismatch");
  }
}

// This boundary is called only by the local CLI; it is never an HTTP endpoint.
export async function runAccountCommand(command: string, input: unknown, target: MaintenanceTarget) {
  await verifyMaintenanceTarget(target);
  if (command === "disable" || command === "enable") {
    const parsed = z.object({ id: z.uuid() }).strict().safeParse(input);
    if (!parsed.success) throw new AccountCommandError("A valid account ID is required");
    const { id } = parsed.data;
    for (let attempt = 0; ; attempt++) {
      try {
        return await prisma.$transaction(async tx => {
          // Match Better Auth's lifecycle protocol: lock the user row first.
          const user = await tx.user.update({ where: { id }, data: { lifecycleLock: randomUUID() } });
          const status = command === "disable" ? "DISABLED" : "ACTIVE";
          await tx.user.update({ where: { id }, data: { status } });
          // Delete on both operations, including repeated calls. Never revive
          // sessions created before a disable/enable cycle.
          await tx.session.deleteMany({ where: { userId: id } });
          await tx.activityLog.create({ data: { action: command === "disable" ? "ACCOUNT_DISABLED" : "ACCOUNT_REENABLED",
            entityType: "User", entityId: id,
            metadata: { operator: target.operator, previousStatus: user.status, status } } });
          return { id };
        });
      } catch (error) {
        if (error instanceof Error && "code" in error) {
          if (error.code === "P2034" && attempt < 2) continue;
          if (error.code === "P2025") throw new AccountCommandError("Account was not found");
        }
        throw new AccountCommandError("Account status change failed");
      }
    }
  }
  if (command !== "create-administrator") throw new AccountCommandError("Unknown maintenance command");
  const parsed = administratorInput.safeParse(input);
  if (!parsed.success) throw new AccountCommandError("Invalid administrator input");
  const { password: plaintext, ...profile } = parsed.data;
  const password = await hashExactPassword(plaintext);
  const id = randomUUID();
  try {
    await prisma.$transaction(async tx => {
      await tx.user.create({ data: { ...profile, id, name: `${profile.firstName} ${profile.lastName}`,
        role: "ADMINISTRATOR", status: "ACTIVE", emailVerified: false,
        // Only the account owner can supply genuine consent via accept-terms.
        termsVersion: null, termsAcceptedAt: null,
        accounts: { create: { accountId: id, providerId: "credential", password } } } });
      await tx.activityLog.create({ data: { action: "ADMINISTRATOR_PROVISIONED", entityType: "User", entityId: id,
        metadata: { operator: target.operator } } });
    });
    return { id };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      throw new AccountCommandError("Email is already registered; use a separate email for the dedicated administrator");
    }
    throw new AccountCommandError("Administrator provisioning failed");
  }
}

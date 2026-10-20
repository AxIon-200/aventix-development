import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { userInfo } from "node:os";

async function main() {
  const [command, ...extra] = process.argv.slice(2);
  if (!command || extra.length || !["create-administrator", "disable", "enable"].includes(command)) {
    console.error("Usage: npm run accounts -- <create-administrator|disable|enable> (all values are prompted)");
    process.exitCode = 1;
    return;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error("Account maintenance requires an interactive terminal");
    process.exitCode = 1;
    return;
  }

  let hidden = false;
  const output = new Writable({ write(chunk, _encoding, callback) {
    if (!hidden) process.stdout.write(chunk);
    callback();
  } });
  const terminal = createInterface({ input: process.stdin, output, terminal: true, historySize: 0 });
  const cancel = new AbortController();
  terminal.on("SIGINT", () => cancel.abort());
  terminal.on("close", () => cancel.abort());
  const ask = (label: string) => terminal.question(label, { signal: cancel.signal });
  const secret = async (label: string) => {
    process.stdout.write(label);
    hidden = true;
    try { return await ask(""); }
    finally { hidden = false; process.stdout.write("\n"); }
  };
  try {
    const maintenance = await import("../lib/account-maintenance.js");
    const target = { expectedProjectRef: (await ask("Confirm target Supabase project reference: ")).trim(), operator: userInfo().username };
    await maintenance.verifyMaintenanceTarget(target);
    let input: unknown;
    if (command === "create-administrator") {
      const email = await ask("Dedicated administrator email: ");
      const firstName = await ask("First name: ");
      const lastName = await ask("Last name: ");
      const password = await secret("Password (hidden, 15-128 characters): ");
      const confirmation = await secret("Confirm password (hidden): ");
      if (password !== confirmation) throw new maintenance.AccountCommandError("Passwords do not match");
      input = { email, firstName, lastName, password };
    } else {
      input = { id: (await ask("Account ID: ")).trim() };
    }
    const result = await maintenance.runAccountCommand(command, input, target);
    console.log(`Completed ${command}. Account ID: ${result.id}`);
    if (command === "create-administrator") {
      console.log("The owner must request verification, verify with their password, accept current terms, then log in. No email, consent, or session was fabricated.");
    }
  } catch (error) {
    // Do not print exception objects, input, connection strings or credentials.
    const { AccountCommandError } = await import("../lib/account-maintenance.js").catch(() => ({ AccountCommandError: null }));
    console.error(AccountCommandError && error instanceof AccountCommandError ? error.message : "Account maintenance could not be completed");
    process.exitCode = 1;
  } finally {
    terminal.close();
    output.end();
    const { prisma } = await import("../lib/prisma.js").catch(() => ({ prisma: null }));
    await prisma?.$disconnect();
  }
}

await main();

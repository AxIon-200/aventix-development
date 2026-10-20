import { randomUUID } from "node:crypto";
import { getCurrentAdapter, runWithTransaction } from "@better-auth/core/context";
import type { DBAdapter, DBTransactionAdapter } from "@better-auth/core/db/adapter";

// Every account lifecycle mutation must acquire this lock before reading gates,
// credentials, links or cooldowns. All writes use the transaction's adapter.
export async function withAccountLock<T>(adapter: DBAdapter, userId: string, operation: (tx: DBTransactionAdapter) => Promise<T>) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await runWithTransaction(adapter, async () => {
        const tx = await getCurrentAdapter(adapter);
        await tx.update({ model: "user", where: [{ field: "id", value: userId }],
          update: { lifecycleLock: randomUUID() } });
        return operation(tx);
      });
    } catch (error) {
      // Retry deadlocks/write conflicts, repeating every authoritative check.
      if (attempt >= 2 || !(error instanceof Error) || !("code" in error) || error.code !== "P2034") throw error;
    }
  }
}

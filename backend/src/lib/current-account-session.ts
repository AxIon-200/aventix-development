import { prisma } from "./prisma.js";
import type { UserRole } from "../generated/prisma/client.js";
import { accountAccessError } from "./account-access.js";

export async function readCurrentAccountSession(token: string, now: () => Date, roles: readonly UserRole[]) {
  return prisma.$transaction(async tx => {
    const candidate = await tx.session.findUnique({ where: { token }, select: { userId: true } });
    if (!candidate) return null;
    // Shared locks conflict with lifecycle updates while allowing concurrent
    // reads. Unlike updating the lock nonce, this preserves profile timestamps.
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM public."user" WHERE id = ${candidate.userId}::uuid FOR SHARE
    `;
    if (!rows.length) return null;
    const session = await tx.session.findUnique({ where: { token } });
    if (!session || session.userId !== candidate.userId || session.expiresAt.getTime() <= now().getTime()) return null;
    const user = await tx.user.findUnique({ where: { id: session.userId } });
    if (!user) return null;
    const credential = await tx.account.findFirst({ where: { userId: user.id, providerId: "credential" } });
    const denied = accountAccessError(user, credential, { roles });
    return { user, denied };
  }, { isolationLevel: "ReadCommitted" });
}

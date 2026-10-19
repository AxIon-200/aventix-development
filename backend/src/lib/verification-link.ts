import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { DBTransactionAdapter } from "@better-auth/core/db/adapter";

export async function issueVerificationLink(tx: DBTransactionAdapter, userId: string, now: Date) {
  const token = randomBytes(32).toString("base64url");
  await tx.create({ model: "authLink", forceAllowId: true, data: {
    id: randomUUID(), userId, purpose: "EMAIL_VERIFICATION",
    digest: createHash("sha256").update(token).digest("hex"),
    createdAt: now, expiresAt: new Date(now.getTime() + 86_400_000),
  } });
  return token;
}

export function verificationUrl(baseURL: string, token: string) {
  const url = new URL("/api/auth/verification", baseURL);
  url.hash = new URLSearchParams({ token }).toString();
  return url.href;
}

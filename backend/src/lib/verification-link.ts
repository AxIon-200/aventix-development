import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { DBTransactionAdapter } from "@better-auth/core/db/adapter";
import { env } from "../config/env.js";

export async function issueVerificationLink(tx: DBTransactionAdapter, userId: string, now: Date) {
  const token = randomBytes(32).toString("base64url");
  await tx.create({ model: "authLink", forceAllowId: true, data: {
    id: randomUUID(), userId, purpose: "EMAIL_VERIFICATION",
    digest: createHash("sha256").update(token).digest("hex"),
    createdAt: now, expiresAt: new Date(now.getTime() + 86_400_000),
  } });
  return token;
}

export function verificationUrl(token: string) {
  const url = new URL("/verify-email", env.FRONTEND_URL);
  url.hash = new URLSearchParams({ token }).toString();
  return url.href;
}

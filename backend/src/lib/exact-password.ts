import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { verifyPassword } from "better-auth/crypto";

const prefix = "aventix-scrypt-v1";
const exactHashPattern = /^aventix-scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/;
export const isExactPasswordHash = (hash: string) => exactHashPattern.test(hash);
const derive = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => error ? reject(error) : resolve(key));
  });

export async function hashExactPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `${prefix}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyExactPassword({ hash, password }: { hash: string; password: string }) {
  const match = exactHashPattern.exec(hash);
  if (!match) return false;
  const key = await derive(password, Buffer.from(match[1]!, "hex"));
  return timingSafeEqual(key, Buffer.from(match[2]!, "hex"));
}

export const isLegacyPasswordHash = (hash: string) => /^[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash);

// Matching legacy credentials only establishes the recovery gate. Callers must
// reject them before mutations or sessions; never silently rehash on a match.
export async function verifyCurrentPassword(input: { hash: string; password: string }) {
  if (isLegacyPasswordHash(input.hash)) return verifyPassword(input);
  return verifyExactPassword(input);
}

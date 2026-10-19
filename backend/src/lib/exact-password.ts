import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const prefix = "aventix-scrypt-v1";
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

// Legacy credentials are intentionally not accepted by this new-registration bridge.
// The recovery/login tickets own the approved mandatory-reset transition.
export async function verifyExactPassword({ hash, password }: { hash: string; password: string }) {
  const match = /^aventix-scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(hash);
  if (!match) return false;
  const key = await derive(password, Buffer.from(match[1]!, "hex"));
  return timingSafeEqual(key, Buffer.from(match[2]!, "hex"));
}

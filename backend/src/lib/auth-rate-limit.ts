import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { prisma } from "./prisma.js";

export function positiveLimit(value: string | number | undefined, fallback: number) {
  const limit = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("Authentication limits must be positive integers");
  return limit;
}

// Express supplies the direct peer (trust proxy=false). IPv4-mapped addresses
// share their IPv4 key; native IPv6 addresses share the first 64 network bits.
function networkKey(ip: string) {
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return mapped[1]!;
  if (isIP(ip) !== 6) return ip;
  const expanded = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
  const [left = "", right = ""] = expanded.split("::");
  const start = left ? left.split(":") : [];
  const end = right ? right.split(":") : [];
  const parts = expanded.includes("::") ? [...start, ...Array<string>(8 - start.length - end.length).fill("0"), ...end] : start;
  return `${parts.slice(0, 4).map(part => part.padStart(4, "0")).join(":")}::/64`;
}

export async function claimRegistrationIp(ip: string, now: Date, registrationLimit: number, aggregateLimit: number) {
  const windowMs = 900_000;
  const window = Math.floor(now.getTime() / windowMs);
  const expiresAt = new Date((window + 1) * windowMs);
  const key = createHash("sha256").update(networkKey(ip)).digest("hex");
  const counts = await prisma.$transaction(async tx => {
    // Fixed order and atomic upserts serialize competing processes without a
    // process-local mutex. Every outcome reaching this boundary counts.
    const aggregate = await tx.authRateLimit.upsert({
      where: { id: `all:${key}:${window}` }, create: { id: `all:${key}:${window}`, count: 1, expiresAt },
      update: { count: { increment: 1 } },
    });
    const registration = await tx.authRateLimit.upsert({
      where: { id: `register:${key}:${window}` }, create: { id: `register:${key}:${window}`, count: 1, expiresAt },
      update: { count: { increment: 1 } },
    });
    return { aggregate: aggregate.count, registration: registration.count };
  });
  return counts.aggregate > aggregateLimit || counts.registration > registrationLimit
    ? Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)) : null;
}

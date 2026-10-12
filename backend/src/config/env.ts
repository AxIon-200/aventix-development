import "dotenv/config";

const PORT = Number(process.env.PORT ?? 5000);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("PORT must be a valid port number");
}

const DATABASE_URL = process.env.DATABASE_URL;
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from .env");
}

if (!BETTER_AUTH_SECRET || BETTER_AUTH_SECRET.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
}

if (!BETTER_AUTH_URL) {
  throw new Error("BETTER_AUTH_URL is missing from .env");
}

new URL(BETTER_AUTH_URL);

export const env = {
  PORT,
  NODE_ENV: process.env.NODE_ENV ?? "development",
  FRONTEND_URL:
    process.env.FRONTEND_URL ?? "http://localhost:3000",
  DATABASE_URL,
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
};
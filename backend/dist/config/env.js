import "dotenv/config";
const PORT = Number(process.env.PORT ?? 5000);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error("PORT must be a valid port number");
}
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is missing from .env");
}
export const env = {
    PORT,
    NODE_ENV: process.env.NODE_ENV ?? "development",
    FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:3000",
    DATABASE_URL,
};
//# sourceMappingURL=env.js.map
import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";

import { createAuth } from "./lib/auth.js";
import { sendVerificationEmail } from "./lib/verification-email.js";
import type { SendVerificationEmail } from "./lib/verification-email.js";
import apiRouter from "./routes/index.js";
import { env } from "./config/env.js";
import { loadCurrentTerms } from "./config/terms.js";
import type { CurrentTerms } from "./config/terms.js";
import { claimRegistrationIp, positiveLimit } from "./lib/auth-rate-limit.js";

export interface AppOptions {
  terms?: CurrentTerms;
  sendVerificationEmail?: SendVerificationEmail;
  now?: () => Date;
  registrationLimit?: number;
  aggregateLimit?: number;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  app.set("trust proxy", false);
  const terms = loadCurrentTerms(options.terms);
  const now = options.now ?? (() => new Date());
  const registrationLimit = positiveLimit(options.registrationLimit ?? process.env.AUTH_REGISTRATION_IP_LIMIT, 5);
  const aggregateLimit = positiveLimit(options.aggregateLimit ?? process.env.AUTH_AGGREGATE_IP_LIMIT, 100);
  const auth = createAuth({ ...(terms ? { terms } : {}),
    sendVerificationEmail: options.sendVerificationEmail ?? sendVerificationEmail,
    now,
  });

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    })
  );

  app.use("/api/auth", async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    const path = req.originalUrl.split("?")[0];
    if (path === "/api/auth/verification") {
      if (req.method !== "GET") {
        res.set("Allow", "GET").status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Method is not allowed" } });
        return;
      }
      res.set("Referrer-Policy", "no-referrer").type("text/plain").send(
        "Submit the token from this link's fragment and your currentPassword as JSON to POST /api/auth/verify-email. Verification never signs you in.");
      return;
    }
    if (path !== "/api/auth/register") {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
      return;
    }
    if (req.method !== "POST") {
      res.set("Allow", "POST").status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Method is not allowed" } });
      return;
    }
    try {
      const retryAfter = await claimRegistrationIp(req.ip ?? req.socket.remoteAddress ?? "unknown", now(), registrationLimit, aggregateLimit);
      if (retryAfter !== null) {
        res.set("Retry-After", String(retryAfter)).status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests" } });
        return;
      }
    } catch {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed" } });
      return;
    }
    if (req.get("Origin") !== env.FRONTEND_URL) {
      res.status(403).json({ error: { code: "ORIGIN_NOT_ALLOWED", message: "Request origin is not allowed" } });
      return;
    }
    if (!req.is("application/json")) {
      res.status(415).json({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "JSON content type is required" } });
      return;
    }
    next();
  });

  // Keep Better Auth before the application JSON parser.
  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.all("/api/v1/terms", (req, res) => {
    res.set("Cache-Control", "no-store");
    if (req.method !== "GET") {
      res.set("Allow", "GET").status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Method is not allowed" } });
      return;
    }
    if (!terms) {
      res.status(503).json({ error: { code: "INTERNAL_ERROR", message: "Current terms are unavailable" } });
      return;
    }
    res.json({ data: terms });
  });

  app.use(express.json());

  app.use("/api/v1", apiRouter);

  return app;
}

export default createApp();

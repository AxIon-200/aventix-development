import cors from "cors";
import express from "express";
import type { ErrorRequestHandler } from "express";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";

import { createAuth } from "./lib/auth.js";
import { sendVerificationEmail } from "./lib/verification-email.js";
import type { SendVerificationEmail } from "./lib/verification-email.js";
import type { SendAuthEmail } from "./lib/auth-email.js";
import type { SendOrganizerDecisionEmail } from "./lib/organizer-decision-email.js";
import { contactRouter } from "./routes/contact.routes.js";
import type { SaveContactMessage } from "./lib/contact-message.js";
import { organizerReviewRouter } from "./lib/organizer-review.js";
import apiRouter from "./routes/index.js";
import { env } from "./config/env.js";
import { loadCurrentTerms } from "./config/terms.js";
import type { CurrentTerms } from "./config/terms.js";
import { claimAuthIp, positiveLimit } from "./lib/auth-rate-limit.js";
import { verificationLanding, passwordResetLanding } from "./lib/verification-landing.js";

export interface AppOptions {
  terms?: CurrentTerms;
  sendVerificationEmail?: SendVerificationEmail;
  sendPasswordResetEmail?: SendAuthEmail;
  sendOrganizerDecisionEmail?: SendOrganizerDecisionEmail;
  saveContactMessage?: SaveContactMessage;
  now?: () => Date;
  registrationLimit?: number;
  verificationLimit?: number;
  verificationResendLimit?: number;
  aggregateLimit?: number;
  loginLimit?: number;
  logoutLimit?: number;
  termsAcceptanceLimit?: number;
  recoveryLimit?: number;
  resetLimit?: number;
  passwordChangeLimit?: number;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  app.set("trust proxy", false);
  const terms = loadCurrentTerms(options.terms);
  const now = options.now ?? (() => new Date());
  const registrationLimit = positiveLimit(options.registrationLimit ?? process.env.AUTH_REGISTRATION_IP_LIMIT, 5);
  const aggregateLimit = positiveLimit(options.aggregateLimit ?? process.env.AUTH_AGGREGATE_IP_LIMIT, 100);
  const mutationLimits: Record<string, number> = {
    "/api/auth/change-password": positiveLimit(options.passwordChangeLimit ?? process.env.AUTH_PASSWORD_CHANGE_IP_LIMIT, 10),
    "/api/auth/request-password-reset": positiveLimit(options.recoveryLimit ?? process.env.AUTH_RECOVERY_IP_LIMIT, 10),
    "/api/auth/reset-password": positiveLimit(options.resetLimit ?? process.env.AUTH_RESET_IP_LIMIT, 10),
    "/api/auth/register": registrationLimit,
    "/api/auth/verify-email": positiveLimit(options.verificationLimit ?? process.env.AUTH_VERIFICATION_IP_LIMIT, 10),
    "/api/auth/resend-verification": positiveLimit(options.verificationResendLimit ?? process.env.AUTH_VERIFICATION_RESEND_IP_LIMIT, 10),
    "/api/auth/login": positiveLimit(options.loginLimit ?? process.env.AUTH_LOGIN_IP_LIMIT, 20),
    "/api/auth/logout": positiveLimit(options.logoutLimit ?? process.env.AUTH_LOGOUT_IP_LIMIT, 60),
    "/api/auth/accept-terms": positiveLimit(options.termsAcceptanceLimit ?? process.env.AUTH_TERMS_ACCEPTANCE_IP_LIMIT, 10),
  };
  const auth = createAuth({ ...(terms ? { terms } : {}),
    ...(options.sendPasswordResetEmail ? { sendPasswordResetEmail: options.sendPasswordResetEmail } : {}),
    ...(options.sendOrganizerDecisionEmail ? { sendOrganizerDecisionEmail: options.sendOrganizerDecisionEmail } : {}),
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
    if (path === "/api/auth/verification" || path === "/api/auth/password-reset") {
      if (req.method !== "GET") {
        res.set("Allow", "GET").status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Method is not allowed" } });
        return;
      }
      const landing = path === "/api/auth/verification" ? verificationLanding : passwordResetLanding;
      res.set({ "Referrer-Policy": "no-referrer", "Content-Security-Policy": landing.policy,
        "X-Content-Type-Options": "nosniff" }).type("html").send(landing.html);
      return;
    }
    if (!path || !Object.hasOwn(mutationLimits, path)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
      return;
    }
    if (req.method !== "POST") {
      res.set("Allow", "POST").status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Method is not allowed" } });
      return;
    }
    try {
      const retryAfter = await claimAuthIp(req.ip ?? req.socket.remoteAddress ?? "unknown", now(), path.slice("/api/auth/".length), mutationLimits[path]!, aggregateLimit);
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
    const bodylessLogout = path === "/api/auth/logout" && !req.headers["transfer-encoding"]
      && (!req.headers["content-length"] || req.headers["content-length"] === "0");
    if (!bodylessLogout && !req.is("application/json")) {
      res.status(415).json({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "JSON content type is required" } });
      return;
    }
    req.headers["x-aventix-client-ip"] = req.ip ?? req.socket.remoteAddress ?? "";
    next();
  });

  // Keep Better Auth before the application JSON parser.
  app.all("/api/auth/*splat", toNodeHandler(auth));

  const parseProfileBody = express.json({ limit: "16kb", strict: false });
  app.use("/api/v1/me", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (req.originalUrl.split("?")[0] !== "/api/v1/me") {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
      return;
    }
    if (req.method !== "GET" && req.method !== "PATCH") {
      res.set("Allow", "GET, PATCH").status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Method is not allowed" } });
      return;
    }
    if (req.method === "PATCH") {
      if (req.get("Origin") !== env.FRONTEND_URL) {
        res.status(403).json({ error: { code: "ORIGIN_NOT_ALLOWED", message: "Request origin is not allowed" } });
        return;
      }
      if (!req.is("application/json")) {
        res.status(415).json({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "JSON content type is required" } });
        return;
      }
      parseProfileBody(req, res, next);
      return;
    }
    next();
  }, async (req, res) => {
    try {
      const headers = fromNodeHeaders(req.headers);
      const response = req.method === "PATCH"
        ? await auth.api.updateOwnProfile({ headers, body: req.body, asResponse: true })
        : await auth.api.readOwnProfile({ headers, asResponse: true });
      res.status(response.status).json(await response.json());
    } catch {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed" } });
    }
  });
  app.use("/api/v1/me", ((error, _req, res, _next) => {
    const tooLarge = error?.type === "entity.too.large";
    res.status(tooLarge ? 413 : 400).json({ error: {
      code: tooLarge ? "PAYLOAD_TOO_LARGE" : "VALIDATION_ERROR",
      message: tooLarge ? "Request body is too large" : "Invalid JSON body",
    } });
  }) satisfies ErrorRequestHandler);

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

  const parseOrganizerBody = express.json({ limit: "16kb", strict: false });
  app.all("/api/v1/organizer-applications", async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (req.method !== "POST") {
      res.set("Allow", "POST").status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Method is not allowed" } });
      return;
    }
    try {
      const retryAfter = await claimAuthIp(req.ip ?? req.socket.remoteAddress ?? "unknown", now(),
        "organizer-application", registrationLimit, aggregateLimit);
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
    parseOrganizerBody(req, res, next);
  }, async (req, res) => {
    try {
      const response = await auth.api.registerOrganizer({ body: req.body, asResponse: true });
      res.status(response.status).json(await response.json());
    } catch {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed" } });
    }
  });
  app.use("/api/v1/organizer-applications", ((error, _req, res, _next) => {
    const tooLarge = error?.type === "entity.too.large";
    res.status(tooLarge ? 413 : 400).json({ error: {
      code: tooLarge ? "PAYLOAD_TOO_LARGE" : "VALIDATION_ERROR",
      message: tooLarge ? "Request body is too large" : "Invalid JSON body",
    } });
  }) satisfies ErrorRequestHandler);

  app.use(express.json());

  app.use("/api/v1/contact", contactRouter(auth, options.saveContactMessage));

  app.use("/api/v1/admin/organizers", organizerReviewRouter(auth, {
    ...(terms ? { terms } : {}), now,
    sendVerificationEmail: options.sendVerificationEmail ?? sendVerificationEmail,
    ...(options.sendOrganizerDecisionEmail ? { sendOrganizerDecisionEmail: options.sendOrganizerDecisionEmail } : {}),
  }));

  app.use("/api/v1", apiRouter);

  return app;
}

export default createApp();

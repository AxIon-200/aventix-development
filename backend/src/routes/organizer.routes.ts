import { Router } from "express";
import type { createAuth } from "../lib/auth.js";
import { requireRoles } from "../lib/authorization.js";
import { env } from "../config/env.js";
import { z } from "zod";
import { OrganizerService } from "../services/organizer.service.js";
import { getOrganizerAnalytics, getOrganizerCheckIns, getOrganizerDashboard, getOrganizerEvent, getOrganizerEvents,
  getOrganizerProfile, organizerError, saveOrganizerEvent, saveOrganizerProfile, scanTicketQRCode } from "../controllers/organizer.controller.js";

export function organizerRouter(auth: ReturnType<typeof createAuth>) {
  const router = Router();
  router.use(requireRoles(auth, ["ORGANIZER"]));
  router.use(async (req, res, next) => {
    if (!["/events", "/analytics", "/analytics/export"].includes(req.path) || req.method !== "GET") z.object({}).strict().parse(req.query);
    if (req.method !== "GET") {
      if (req.get("Origin") !== env.FRONTEND_URL) { res.status(403).json({ error: { code: "ORIGIN_NOT_ALLOWED", message: "Request origin is not allowed" } }); return; }
      if (!req.is("application/json")) { res.status(415).json({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "JSON content type is required" } }); return; }
    }
    res.locals.organization = await OrganizerService.organization(res.locals.user.id);
    next();
  });
  router.get("/dashboard", getOrganizerDashboard);
  router.get("/events", getOrganizerEvents);
  router.get("/events/:id", getOrganizerEvent);
  router.post("/events", saveOrganizerEvent);
  router.patch("/events/:id", saveOrganizerEvent);
  router.get("/profile", getOrganizerProfile);
  router.patch("/profile", saveOrganizerProfile);
  router.post("/check-in", scanTicketQRCode);
  router.get("/check-ins", getOrganizerCheckIns);
  router.get("/analytics", getOrganizerAnalytics);
  router.get("/analytics/export", getOrganizerAnalytics);
  router.use(organizerError);
  return router;
}

import express, { Router } from "express";
import type { createAuth } from "../lib/auth.js";
import { requireRoles } from "../lib/authorization.js";
import { env } from "../config/env.js";
import { z } from "zod";
import { OrganizerService } from "../services/organizer.service.js";
import { getOrganizerAnalytics, getOrganizerCheckIns, getOrganizerDashboard, getOrganizerEvent, getOrganizerEvents,
  getOrganizerProfile, organizerError, publishOrganizerEvent, saveOrganizerEvent, saveOrganizerPoster, saveOrganizerProfile, saveOrganizerTier, scanTicketQRCode } from "../controllers/organizer.controller.js";
import { MAX_EVENT_IMAGE_BYTES } from "../lib/event-image.js";
import { prisma } from "../lib/prisma.js";

export function organizerRouter(auth: ReturnType<typeof createAuth>) {
  const router = Router();
  router.use(requireRoles(auth, ["ORGANIZER"]));
  router.use(async (req, res, next) => {
    if (!["/events", "/analytics", "/analytics/export"].includes(req.path) || req.method !== "GET") z.object({}).strict().parse(req.query);
    if (req.method !== "GET") {
      if (req.get("Origin") !== env.FRONTEND_URL) { res.status(403).json({ error: { code: "ORIGIN_NOT_ALLOWED", message: "Request origin is not allowed" } }); return; }
      const imageUpload = req.method === "PUT" && /^\/events\/[^/]+\/images\/poster$/.test(req.path);
      if (!imageUpload && !req.is("application/json")) { res.status(415).json({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "JSON content type is required" } }); return; }
      if (imageUpload && !["image/jpeg", "image/png", "image/webp"].some(type => req.is(type))) {
        res.status(415).json({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "JPEG, PNG, or WebP is required" } }); return;
      }
    }
    res.locals.organization = await OrganizerService.organization(res.locals.user.id);
    next();
  });
  router.get("/dashboard", getOrganizerDashboard);
  router.get("/events", getOrganizerEvents);
  router.get("/events/:id/images/poster", async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const image = await prisma.eventImage.findUnique({ where: { eventId_kind: { eventId: id, kind: "poster" } },
      include: { event: { select: { organizerId: true } } } });
    if (!image || image.event.organizerId !== res.locals.organization.id) { res.sendStatus(404); return; }
    res.set({ "Content-Type": image.mimeType, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.send(Buffer.from(image.data));
  });
  router.get("/events/:id", getOrganizerEvent);
  router.post("/events", saveOrganizerEvent);
  router.patch("/events/:id", saveOrganizerEvent);
  router.put("/events/:id/images/poster", express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: MAX_EVENT_IMAGE_BYTES }), saveOrganizerPoster);
  router.post("/events/:id/tiers", saveOrganizerTier);
  router.patch("/events/:id/tiers/:tierId", saveOrganizerTier);
  router.post("/events/:id/publish", publishOrganizerEvent);
  router.get("/profile", getOrganizerProfile);
  router.patch("/profile", saveOrganizerProfile);
  router.post("/check-in", scanTicketQRCode);
  router.get("/check-ins", getOrganizerCheckIns);
  router.get("/analytics", getOrganizerAnalytics);
  router.get("/analytics/export", getOrganizerAnalytics);
  router.use(organizerError);
  return router;
}

import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { requireRoles } from "../lib/authorization.js";
import type { createAuth } from "../lib/auth.js";
import { saveContactMessage, type SaveContactMessage } from "../lib/contact-message.js";

const input = z.object({
  subject: z.string().trim().min(1).max(150).refine(value => !/[\r\n]/.test(value)),
  message: z.string().trim().min(10).max(5000),
}).strict();

export function contactRouter(auth: ReturnType<typeof createAuth>, save: SaveContactMessage = saveContactMessage) {
  const router = Router();
  router.post("/", requireRoles(auth, ["ATTENDEE"]), async (req, res) => {
    if (req.get("Origin") !== env.FRONTEND_URL) {
      res.status(403).json({ error: { code: "ORIGIN_NOT_ALLOWED", message: "Request origin is not allowed" } });
      return;
    }
    if (!req.is("application/json")) {
      res.status(415).json({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "JSON content type is required" } });
      return;
    }
    const parsed = input.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Check the subject and message" } });
      return;
    }
    const user = res.locals.user as { id: string; name: string; email: string };
    try {
      const saved = await save({ ...parsed.data, attendeeId: user.id, senderName: user.name, senderEmail: user.email });
      res.status(201).json({ data: { id: saved.id, createdAt: saved.createdAt.toISOString() } });
    } catch {
      res.status(503).json({ error: { code: "SUBMISSION_UNAVAILABLE", message: "The message could not be saved. Please try again later." } });
    }
  });
  return router;
}

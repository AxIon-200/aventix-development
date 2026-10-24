import { Router } from "express";
import { getAttendeeDashboard } from "../controllers/attendee.controller.js";
import { requireRoles } from "../lib/authorization.js";
import type { createAuth } from "../lib/auth.js";

export function attendeeRouter(auth: ReturnType<typeof createAuth>) {
  const router = Router();
  router.use(requireRoles(auth, ["ATTENDEE"]));
  router.get("/dashboard", getAttendeeDashboard);
  return router;
}

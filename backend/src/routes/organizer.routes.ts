import { Router } from "express";
import {
  getOrganizerDashboard,
  getOrganizerEvents,
  scanTicketQRCode,
} from "../controllers/organizer.controller.js";
import { requireRole } from "../middlewares/role.middleware.js";

const router = Router();

// Protected routes for ORGANIZER (or higher)
router.use(requireRole("ORGANIZER", "ADMINISTRATOR"));

router.get("/dashboard", getOrganizerDashboard);
router.get("/events", getOrganizerEvents);
router.post("/check-in", scanTicketQRCode);

export default router;

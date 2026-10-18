import { Router } from "express";
import {
  getAttendeeDashboard,
  getAttendeeTickets,
  getAttendeeBookings,
} from "../controllers/attendee.controller.js";
import { requireRole } from "../middlewares/role.middleware.js";

const router = Router();

// Protected routes for ATTENDEE (or higher)
router.use(requireRole("ATTENDEE", "ADMINISTRATOR"));

router.get("/dashboard", getAttendeeDashboard);
router.get("/tickets", getAttendeeTickets);
router.get("/bookings", getAttendeeBookings);

export default router;

import { Router } from "express";
import {
  getAdminOverview,
  listAllUsers,
  listAllOrganizers,
  listAllBookings,
} from "../controllers/admin.controller.js";
import { requireRole } from "../middlewares/role.middleware.js";

const router = Router();

// Protected routes strictly for ADMINISTRATOR
router.use(requireRole("ADMINISTRATOR"));

router.get("/dashboard/overview", getAdminOverview);
router.get("/users", listAllUsers);
router.get("/organizers", listAllOrganizers);
router.get("/bookings", listAllBookings);

export default router;

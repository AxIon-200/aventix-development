import { Router } from "express";
import { getPublicEvents, getEventCategories } from "../controllers/guest.controller.js";

const router = Router();

// Public routes accessible by Guests without authentication
router.get("/events", getPublicEvents);
router.get("/categories", getEventCategories);

export default router;

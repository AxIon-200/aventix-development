import { Router } from "express";
import healthRouter from "./health.routes.js";
import guestRouter from "./guest.routes.js";
import attendeeRouter from "./attendee.routes.js";
import organizerRouter from "./organizer.routes.js";
import adminRouter from "./admin.routes.js";

const router = Router();

// Health check
router.use("/health", healthRouter);

// Role-based API routing
router.use("/guest", guestRouter);
router.use("/attendee", attendeeRouter);
router.use("/organizer", organizerRouter);
router.use("/admin", adminRouter);

export default router;
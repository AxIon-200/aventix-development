import { Router } from "express";
import healthRouter from "./health.routes.js";
import guestRouter from "./guest.routes.js";
import publicEventsRouter from "./public-events.routes.js";

const router = Router();

// Health check
router.use("/health", healthRouter);

// Public browsing remains separate from the account integration.
router.use("/guest", guestRouter);
router.use("/events", publicEventsRouter);
// Business routers are unfinished stubs. Mount them only in their later slices,
// with live account eligibility, exact roles, and resource ownership checks.

export default router;
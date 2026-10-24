import { Router } from "express";
import { PublicEventsService } from "../services/public-events.service.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    res.json({ data: await PublicEventsService.list() });
  } catch {
    res.status(500).json({ error: { code: "EVENTS_UNAVAILABLE", message: "Events could not be loaded" } });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      res.status(404).json({ error: { code: "EVENT_NOT_FOUND", message: "Event not found" } });
      return;
    }
    const event = await PublicEventsService.get(id);
    if (!event) {
      res.status(404).json({ error: { code: "EVENT_NOT_FOUND", message: "Event not found" } });
      return;
    }
    res.json({ data: event });
  } catch {
    res.status(500).json({ error: { code: "EVENTS_UNAVAILABLE", message: "Event could not be loaded" } });
  }
});

export default router;

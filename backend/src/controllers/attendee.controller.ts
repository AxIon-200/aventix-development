import type { Request, Response } from "express";
import { AttendeeService } from "../services/attendee.service.js";

export const getAttendeeDashboard = async (_req: Request, res: Response) => {
  try {
    const data = await AttendeeService.getDashboard(res.locals.user.id);
    return res.json({ data });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Attendee records could not be loaded" } });
  }
};

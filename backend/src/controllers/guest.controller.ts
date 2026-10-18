import { Request, Response } from "express";
import { GuestService } from "../services/guest.service.js";

export const getPublicEvents = async (req: Request, res: Response) => {
  const events = await GuestService.getEvents();
  return res.json({ success: true, data: events });
};

export const getEventCategories = async (req: Request, res: Response) => {
  const categories = await GuestService.getCategories();
  return res.json({ success: true, data: categories });
};

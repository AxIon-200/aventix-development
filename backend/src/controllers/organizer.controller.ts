import { Request, Response } from "express";
import { OrganizerService } from "../services/organizer.service.js";

export const getOrganizerDashboard = async (req: Request, res: Response) => {
  const data = await OrganizerService.getDashboard();
  return res.json(data);
};

export const getOrganizerEvents = async (req: Request, res: Response) => {
  const events = await OrganizerService.getEvents();
  return res.json({ success: true, data: events });
};

export const scanTicketQRCode = async (req: Request, res: Response) => {
  const { ticketCode } = req.body;
  const result = await OrganizerService.validateGateCheckIn(ticketCode || "TKT-UNKNOWN");
  return res.json(result);
};

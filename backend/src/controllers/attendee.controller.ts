import type { Request, Response } from "express";
import { AttendeeService } from "../services/attendee.service.js";

export const getAttendeeDashboard = async (req: Request, res: Response) => {
  const data = await AttendeeService.getDashboard();
  return res.json(data);
};

export const getAttendeeTickets = async (req: Request, res: Response) => {
  const tickets = await AttendeeService.getTickets();
  return res.json({ success: true, data: tickets });
};

export const getAttendeeBookings = async (req: Request, res: Response) => {
  const bookings = await AttendeeService.getBookings();
  return res.json({ success: true, data: bookings });
};

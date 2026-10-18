import { Request, Response } from "express";
import { AdminService } from "../services/admin.service.js";

export const getAdminOverview = async (req: Request, res: Response) => {
  const data = await AdminService.getOverview();
  return res.json({ success: true, data });
};

export const listAllUsers = async (req: Request, res: Response) => {
  const users = await AdminService.getUsers();
  return res.json({ success: true, data: users });
};

export const listAllOrganizers = async (req: Request, res: Response) => {
  const organizers = await AdminService.getOrganizers();
  return res.json({ success: true, data: organizers });
};

export const listAllBookings = async (req: Request, res: Response) => {
  const bookings = await AdminService.getBookings();
  return res.json({ success: true, data: bookings });
};

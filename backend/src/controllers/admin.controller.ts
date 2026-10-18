import { Request, Response } from "express";

export const getAdminOverview = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      totalUsers: 1420,
      totalOrganizers: 38,
      totalEvents: 64,
      ticketsSold: 9450,
      grossRevenue: 2845000,
    },
  });
};

export const listAllUsers = async (req: Request, res: Response) => {
  return res.json({ success: true, data: [] });
};

export const listAllOrganizers = async (req: Request, res: Response) => {
  return res.json({ success: true, data: [] });
};

export const listAllBookings = async (req: Request, res: Response) => {
  return res.json({ success: true, data: [] });
};

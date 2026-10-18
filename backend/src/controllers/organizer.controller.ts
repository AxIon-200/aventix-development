import { Request, Response } from "express";

export const getOrganizerDashboard = async (req: Request, res: Response) => {
  return res.json({
    organizerName: "Mary",
    organizationName: "Aventix Live Productions",
    stats: [
      { label: "Active Events", value: "4 Live", change: "+1 this month" },
      { label: "Tickets Sold", value: "1,840", change: "+18.2%" },
      { label: "Gross Sales", value: "₱425,000", change: "+24.5%" },
      { label: "Check-in Rate", value: "92%", change: "On target" },
    ],
    activeEvents: [
      {
        id: "ev-001",
        title: "Electric Pulse Music Festival 2026",
        category: "Concert",
        startDate: "2026-11-15",
        venue: "Mall of Asia Arena",
        status: "PUBLISHED",
        ticketsSold: 1250,
        totalCapacity: 1500,
        grossRevenue: 312500,
      },
    ],
    recentTicketSales: [],
  });
};

export const getOrganizerEvents = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: [],
  });
};

export const scanTicketQRCode = async (req: Request, res: Response) => {
  const { ticketCode } = req.body;
  return res.json({
    success: true,
    valid: true,
    attendee: "Sherwin Cruz",
    ticketTier: "VIP Lounge",
    scannedAt: new Date().toISOString(),
  });
};

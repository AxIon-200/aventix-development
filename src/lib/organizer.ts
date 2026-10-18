import { OrganizerDashboard } from "@/types/organizer";

export const sampleOrganizerDashboard: OrganizerDashboard = {
  organizerName: "Mary",
  organizationName: "Aventix Live Productions",
  stats: [
    {
      label: "Active Events",
      value: "4 Live",
      change: "+1 this month",
      footnote: "Across 2 venues",
    },
    {
      label: "Tickets Sold",
      value: "1,840",
      change: "+18.2%",
      footnote: "85% capacity reached",
    },
    {
      label: "Gross Sales",
      value: "₱425,000",
      change: "+24.5%",
      footnote: "Net payout pending",
    },
    {
      label: "Check-in Rate",
      value: "92%",
      change: "On target",
      footnote: "Real-time gate scans",
    },
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
    {
      id: "ev-002",
      title: "Manila Tech Summit & Hackathon",
      category: "Conference",
      startDate: "2026-12-05",
      venue: "SMX Convention Center",
      status: "PUBLISHED",
      ticketsSold: 590,
      totalCapacity: 800,
      grossRevenue: 112500,
    },
  ],
  recentTicketSales: [
    {
      id: "sale-101",
      buyerName: "Sherwin Cruz",
      eventTitle: "Electric Pulse Music Festival 2026",
      tier: "VIP Pass",
      amount: 4500,
      purchasedAt: "10 minutes ago",
    },
    {
      id: "sale-102",
      buyerName: "Anna Reyes",
      eventTitle: "Manila Tech Summit & Hackathon",
      tier: "Standard Pass",
      amount: 1500,
      purchasedAt: "25 minutes ago",
    },
  ],
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export async function getOrganizerDashboard(): Promise<OrganizerDashboard> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/organizer/dashboard`, { cache: "no-store" });
      if (res.ok) return (await res.json()) as OrganizerDashboard;
    } catch {
      // fallback to sample data
    }
  }
  return sampleOrganizerDashboard;
}

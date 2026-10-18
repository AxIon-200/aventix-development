export class AttendeeService {
  static async getDashboard(attendeeId?: string) {
    return {
      attendeeName: "Sherwin",
      eventsThisMonth: 2,
      stats: [
        { label: "My Tickets", value: "5 Active", badge: "2 upcoming", footnote: "Across 3 different events" },
        { label: "Upcoming Events", value: "2 Events", badge: "This month", footnote: "Next: Neon Eclipse Rave" },
        { label: "Total Spent", value: "₱18,500", badge: "Lifetime", footnote: "Across 12 orders" },
        { label: "Reward Points", value: "1,240 pts", badge: "Silver Tier", footnote: "760 pts to Gold" },
      ],
      upcomingEvents: [
        {
          ticketId: "t-001",
          eventId: "e-001",
          name: "Neon Eclipse Rave",
          organizerEmail: "neon@aventix.io",
          ticketTier: "VIP Lounge",
          date: "Oct 24",
          venue: "Warehouse District",
          status: "confirmed",
        },
        {
          ticketId: "t-002",
          eventId: "e-002",
          name: "Sunset Jazz Festival",
          organizerEmail: "jazz@aventix.io",
          ticketTier: "General Admission",
          date: "Nov 02",
          venue: "Riverside Park",
          status: "pending",
        },
      ],
    };
  }

  static async getTickets(attendeeId?: string) {
    return [];
  }

  static async getBookings(attendeeId?: string) {
    return [];
  }
}

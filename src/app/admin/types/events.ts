export type EventStatus = "published" | "draft" | "cancelled" | "sold_out" | "completed";
export type EventStatusFilter = EventStatus | "all";

export type EventCategory = "concert" | "gig" | "festival";
export type EventCategoryFilter = EventCategory | "all";

export type EventFilters = {
  status: EventStatusFilter;
  category: EventCategoryFilter;
};

// One row of the table (GET /admin/events)
export type AdminEvent = {
  id: string;
  eventCode: string; // display id, e.g. "EVT-401"
  title: string;
  organizerName: string;
  startsAt: string | null; // ISO
  venue: string;
  status: EventStatus;
  category: EventCategory | null;
  updatedAt: string;
  attendees: number; // tickets sold / people attending
};

export type TicketTierSummary = {
  id: string;
  name: string;
  price: number;
  sold: number;
  capacity: number | null;
};

// GET /admin/events/:id (details modal)
export type AdminEventDetails = AdminEvent & {
  description?: string | null;
  capacity: number | null;
  revenue: number;
  tiers: TicketTierSummary[];
  cancellationReason?: string | null;
};

// GET /admin/events/stats
export type EventStats = {
  total: number;
  published: number;
  draft: number;
  cancelled: number;
  soldOut: number;
  completed: number;
};

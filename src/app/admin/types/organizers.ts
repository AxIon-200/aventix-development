export type OrganizerStatus = "approved" | "review" | "rejected" | "inactive";
export type OrganizerStatusFilter = OrganizerStatus | "all";

// The decision an admin can make from the table / details modal.
export type OrganizerDecision = "approved" | "rejected";

export type OrganizerFilters = { status: OrganizerStatusFilter };

// One row of the table (GET /admin/organizers)
export type Organizer = {
  id: string;
  organizerCode: string; // display id, e.g. "ORG-201"
  name: string;
  email: string;
  status: OrganizerStatus;
  eventsCount: number;
  avatarUrl?: string | null;
};

export type OrganizerEventRow = {
  id: string;
  title: string;
  date: string; // ISO
  status: "published" | "draft";
};

// GET /admin/organizers/:id (details modal)
export type OrganizerDetails = Organizer & {
  phone?: string | null;
  appliedAt: string; // ISO
  publishedEvents: number;
  draftEvents: number;
  ticketsSold: number;
  rejectionReason?: string | null;
  recentEvents: OrganizerEventRow[]; // up to 5
};

// GET /admin/organizers/stats
export type OrganizerStats = {
  total: number;
  needsReview: number;
  approved: number;
  totalEvents: number; // published + draft
};

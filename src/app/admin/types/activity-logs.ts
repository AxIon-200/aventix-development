export type LogCategory = "auth" | "user" | "organizer" | "event" | "booking" | "payment" | "system";
export type LogCategoryFilter = LogCategory | "all";

export type LogResult = "success" | "failed";
export type LogResultFilter = LogResult | "all";

export type ActorRole = "admin" | "organizer" | "user" | "system";

export type ActivityLogFilters = {
  category: LogCategoryFilter;
  result: LogResultFilter;
  from: string; // "YYYY-MM-DD" or "" (no lower bound), inclusive
  to: string; // "YYYY-MM-DD" or "" (no upper bound), inclusive
};

// One row of the table (GET /admin/activity-logs)
export type ActivityLog = {
  id: string;
  logCode: string; // display id, e.g. "LOG-100231"
  occurredAt: string; // ISO
  actorName: string;
  actorRole: ActorRole;
  action: string; // display text, e.g. "Approved organizer"
  targetLabel: string; // display text, e.g. "Soundwave PH (ORG-201)"
  category: LogCategory;
  result: LogResult;
};

export type LogChange = {
  field: string; // e.g. "Status"
  from: string; // e.g. "Review"
  to: string; // e.g. "Approved"
};

// GET /admin/activity-logs/:id (details modal)
export type ActivityLogDetails = ActivityLog & {
  actorEmail?: string | null;
  description: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  changes: LogChange[];
  errorMessage?: string | null; // set when result is "failed"
};

// GET /admin/activity-logs/stats  (computed for the CURRENT search + filters)
export type ActivityLogStats = {
  total: number;
  last24Hours: number;
  adminActions: number;
  failed: number;
};

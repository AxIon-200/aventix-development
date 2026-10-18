import {
  ActivityLog,
  ActorRole,
  LogCategory,
  LogChange,
  LogResult,
} from "@/app/admin/types/activity-logs";

// ─────────────────────────────────────────────────────────────
// DEMO SWITCHES — only used while USE_MOCK is true in activityLogService.ts
//   seedLogs:     false = empty table (the real starting state)
//                 true  = 120 sample log entries
//   failRequests: true  = every request fails (preview the error states)
// ─────────────────────────────────────────────────────────────
export const DEMO = {
  seedLogs: false,
  failRequests: false,
};

export type LogExtras = {
  actorEmail: string | null;
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
  changes: LogChange[];
  errorMessage: string | null;
};

const ADMINS = ["Admin Administrator", "Maria Admin"];
const USERS = ["Mia Santos", "Noah Garcia", "Alyssa Cruz", "Ethan Lim", "Sofia Reyes", "Daniel Tan", "Nina Ramos"];
const ORGS = ["Soundwave PH", "Manila Arts Lab", "Pulse Collective", "Northstar Live", "Metro Makers"];
const EVENTS = ["Neon Nights: Live Sessions", "Art After Dark", "Build & Ship Weekend", "Northstar Acoustic Night", "Pulse Summit"];
const AGENTS = ["Chrome 126 on Windows", "Safari 17 on iOS", "Firefox 127 on macOS"];

const pick = <T,>(list: T[], i: number) => list[i % list.length];

type Template = {
  category: LogCategory;
  action: string;
  role: ActorRole;
  target: (i: number) => string;
  changes?: LogChange[];
  result?: LogResult;
  error?: string;
};

const TEMPLATES: Template[] = [
  { category: "auth", action: "Signed in to admin console", role: "admin", target: () => "Admin console" },
  { category: "user", action: "Deactivated user", role: "admin", target: (i) => `${pick(USERS, i)} (USR-${1000 + (i % 40)})`, changes: [{ field: "Status", from: "Active", to: "Inactive" }] },
  { category: "user", action: "Activated user", role: "admin", target: (i) => `${pick(USERS, i + 2)} (USR-${1000 + (i % 40)})`, changes: [{ field: "Status", from: "Pending", to: "Active" }] },
  { category: "organizer", action: "Approved organizer", role: "admin", target: (i) => `${pick(ORGS, i)} (ORG-${201 + (i % 5)})`, changes: [{ field: "Status", from: "Review", to: "Approved" }] },
  { category: "organizer", action: "Rejected organizer", role: "admin", target: (i) => `${pick(ORGS, i + 1)} (ORG-${201 + (i % 5)})`, changes: [{ field: "Status", from: "Review", to: "Rejected" }] },
  { category: "event", action: "Cancelled event", role: "admin", target: (i) => `${pick(EVENTS, i)} (EVT-${401 + (i % 5)})`, changes: [{ field: "Status", from: "Published", to: "Cancelled" }] },
  { category: "event", action: "Published event", role: "organizer", target: (i) => `${pick(EVENTS, i + 1)} (EVT-${401 + (i % 5)})`, changes: [{ field: "Status", from: "Draft", to: "Published" }] },
  { category: "booking", action: "Marked booking as paid", role: "admin", target: (i) => `BKG-${9031 + (i % 60)}`, changes: [{ field: "Payment", from: "Pending", to: "Paid" }, { field: "Booking", from: "Pending", to: "Confirmed" }] },
  { category: "booking", action: "Created booking", role: "user", target: (i) => `BKG-${9031 + (i % 60)}` },
  { category: "payment", action: "Refunded payment", role: "admin", target: (i) => `PAY-${70331 + (i % 60)}`, changes: [{ field: "Status", from: "Paid", to: "Refunded" }] },
  { category: "auth", action: "Failed sign-in attempt", role: "user", target: () => "Attendee sign-in", result: "failed", error: "Invalid email or password" },
  { category: "system", action: "Scheduled export completed", role: "system", target: () => "Nightly report" },
  { category: "payment", action: "Payment capture failed", role: "system", target: (i) => `PAY-${70331 + (i % 60)}`, result: "failed", error: "Payment provider timed out" },
];

function buildDemoLogs(count: number): { logs: ActivityLog[]; extras: Map<string, LogExtras> } {
  const logs: ActivityLog[] = [];
  const extras = new Map<string, LogExtras>();

  for (let i = 0; i < count; i++) {
    const t = TEMPLATES[(i * 5 + 2) % TEMPLATES.length];
    const number = 100231 + (count - 1 - i); // newest entry has the highest number
    const id = `log-${number}`;
    const actorName =
      t.role === "admin" ? pick(ADMINS, i)
      : t.role === "organizer" ? pick(ORGS, i)
      : t.role === "user" ? pick(USERS, i + 3)
      : "System";
    const target = t.target(i);

    logs.push({
      id,
      logCode: `LOG-${number}`,
      occurredAt: new Date(Date.now() - i * 47 * 60_000).toISOString(),
      actorName,
      actorRole: t.role,
      action: t.action,
      targetLabel: target,
      category: t.category,
      result: t.result ?? "success",
    });
    extras.set(id, {
      actorEmail: t.role === "system" ? null : `${actorName.toLowerCase().replace(/\s+/g, ".")}@aventix.com`,
      description: `${actorName} ${t.action.toLowerCase()} on ${target}.`,
      ipAddress: t.role === "system" ? null : `203.0.113.${((i * 7) % 250) + 1}`,
      userAgent: t.role === "system" ? null : pick(AGENTS, i),
      changes: t.changes ?? [],
      errorMessage: t.error ?? null,
    });
  }
  return { logs, extras };
}

const seeded = DEMO.seedLogs ? buildDemoLogs(120) : { logs: [], extras: new Map<string, LogExtras>() };

// Logs are append-only: there is no way to edit or delete one from the admin UI.
export const mockActivityLogs: ActivityLog[] = seeded.logs;
export const mockLogExtras: Map<string, LogExtras> = seeded.extras;

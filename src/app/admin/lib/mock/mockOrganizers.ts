import { Organizer, OrganizerStatus } from "@/app/admin/types/organizers";

// ─────────────────────────────────────────────────────────────
// DEMO SWITCHES — only used while USE_MOCK is true in organizerService.ts
//   seedOrganizers: false = empty table (the real starting state)
//                   true  = 63 sample organizers
//   failRequests:   true  = every request fails (preview the error states)
// ─────────────────────────────────────────────────────────────
export const DEMO = {
  seedOrganizers: true,
  failRequests: false,
};

const PREFIX = ["Soundwave", "Manila Arts", "Pulse", "Northstar", "Metro", "Bayside", "Echo", "Harbor", "Neon", "Lakeside", "Sunset", "Velvet"];
const SUFFIX = ["PH", "Lab", "Collective", "Live", "Makers", "Events", "Productions"];
const STATUS_CYCLE: OrganizerStatus[] = ["approved", "approved", "inactive", "rejected", "review", "approved", "approved", "review"];

function buildDemoOrganizers(count: number): Organizer[] {
  return Array.from({ length: count }, (_, i) => {
    const p = PREFIX[i % PREFIX.length];
    const s = SUFFIX[(i * 3 + 1) % SUFFIX.length];
    const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
    const slug = `${p}${s}`.replace(/\s+/g, "").toLowerCase();
    return {
      id: `org-${201 + i}`,
      organizerCode: `ORG-${201 + i}`,
      name: `${p} ${s}`,
      email: `hello@${slug}.ph`,
      status,
      eventsCount: status === "rejected" ? 0 : status === "review" ? i % 4 : ((i * 5) % 9) + 1,
      avatarUrl: null,
    };
  });
}

// Mutable on purpose: the mock service edits it so approve/reject really
// change what the table and stat cards show.
export const mockOrganizers: Organizer[] = DEMO.seedOrganizers ? buildDemoOrganizers(63) : [];
export const mockRejectionReasons = new Map<string, string>();

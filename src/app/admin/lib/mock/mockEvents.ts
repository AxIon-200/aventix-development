import { AdminEvent, EventCategory, EventStatus } from "@/app/admin/types/events";

// ─────────────────────────────────────────────────────────────
// DEMO SWITCHES — only used while USE_MOCK is true in eventService.ts
//   seedEvents:   false = empty table (the real starting state)
//                 true  = 52 sample events
//   failRequests: true  = every request fails (preview the error states)
// ─────────────────────────────────────────────────────────────
export const DEMO = {
  seedEvents: true,
  failRequests: false,
};

const TITLES = [
  "Neon Nights: Live Sessions", "After Dark", "Pulse Summit", "Northstar Acoustic Night",
  "Build & Ship Weekend", "Systems 101", "Sunset Sessions", "Echo Chamber Live",
  "Harbor Lights Festival", "Velvet Underground Night", "Metro Beats", "Lakeside Unplugged",
];
const ORGANIZERS = ["Soundwave PH", "Manila Lab", "Pulse Collective", "Northstar Live", "Metro Makers", "Bayside Events"];
const VENUES = ["The Astoria", "Poblacion Space", "BGC Convention Hall", "The Pantry", "Makati Makerspace", "BGC Grounds Center"];
const CATEGORIES: EventCategory[] = ["concert", "gig", "festival", "gig", "concert", "festival"];
const STATUS_CYCLE: EventStatus[] = ["published", "published", "draft", "cancelled", "published", "published", "published", "draft"];

function buildDemoEvents(count: number): AdminEvent[] {
  const DAY = 86_400_000;
  return Array.from({ length: count }, (_, i) => {
    const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
    return {
      id: `evt-${401 + i}`,
      eventCode: `EVT-${401 + i}`,
      title: `${TITLES[i % TITLES.length]}${i >= TITLES.length ? ` Vol. ${Math.floor(i / TITLES.length) + 1}` : ""}`,
      organizerName: ORGANIZERS[i % ORGANIZERS.length],
      startsAt: new Date(Date.now() + (i * 3 - 4) * DAY).toISOString(),
      venue: VENUES[i % VENUES.length],
      status,
      category: CATEGORIES[i % CATEGORIES.length],
      attendees: status === "published" ? ((i * 53) % 480) + 20 : 0,
    };
  });
}

// Mutable on purpose: the mock service edits it so availability changes
// really update the table and stat cards.
export const mockEvents: AdminEvent[] = DEMO.seedEvents ? buildDemoEvents(52) : [];
export const mockCancellationReasons = new Map<string, string>();

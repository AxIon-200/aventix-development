import type { EventDetails } from "@/types/event";

export type DateFilter = "all" | "today" | "weekend" | "month" | "next-month";

export const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "All Dates" },
  { value: "today", label: "Today" },
  { value: "weekend", label: "This Weekend" },
  { value: "month", label: "This Month" },
  { value: "next-month", label: "Next Month" },
];

const TZ = "Asia/Manila";

/** Calendar parts of an instant, in Manila time. */
function parts(date: Date) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric", weekday: "short" });
  const o: Record<string, string> = {};
  for (const p of f.formatToParts(date)) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, wd: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday) };
}
const dayNumber = (p: { y: number; m: number; d: number }) => Date.UTC(p.y, p.m - 1, p.d) / 86400000;

export function matchesDate(iso: string, filter: DateFilter, now = new Date()): boolean {
  if (filter === "all") return true;
  const e = parts(new Date(iso));
  const n = parts(now);
  switch (filter) {
    case "today":
      return dayNumber(e) === dayNumber(n);
    case "weekend": {
      // Saturday + Sunday of the current Mon-Sun week.
      const today = dayNumber(n);
      const sat = n.wd === 0 ? today - 1 : today + (6 - n.wd);
      const de = dayNumber(e);
      return de === sat || de === sat + 1;
    }
    case "month":
      return e.y === n.y && e.m === n.m;
    case "next-month": {
      const ny = n.m === 12 ? n.y + 1 : n.y;
      const nm = n.m === 12 ? 1 : n.m + 1;
      return e.y === ny && e.m === nm;
    }
  }
}

export function uniqueSorted(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b));
}

export function eventLocation(e: EventDetails): string {
  return e.venue.city ?? e.venue.name;
}

export function minPrice(e: EventDetails): number | null {
  const prices = e.categories.filter((c) => c.status === "ACTIVE").map((c) => c.price);
  return prices.length ? Math.min(...prices) : null;
}

/** "OCTOBER 2026" key + label for grouping, in Manila time. */
export function monthKey(iso: string): { key: string; label: string } {
  const p = parts(new Date(iso));
  const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso)).toUpperCase();
  return { key: `${p.y}-${String(p.m).padStart(2, "0")}`, label };
}

export function dateBadge(iso: string): { month: string; day: string; year: string } {
  const d = new Date(iso);
  return {
    month: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: TZ }).format(d).toUpperCase(),
    day: new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone: TZ }).format(d),
    year: new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: TZ }).format(d),
  };
}

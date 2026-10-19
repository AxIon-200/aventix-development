import Link from "next/link";
import { TICKET_TABS, type TicketTab } from "@/lib/tickets";

interface TicketTabsProps {
  active: TicketTab;
  counts: Record<TicketTab, number>;
}

// Tabs are links (?tab=past), so they work with the keyboard and the page stays server-rendered.
export default function TicketTabs({ active, counts }: TicketTabsProps) {
  return (
    <nav aria-label="Ticket views" className="flex gap-1 overflow-x-auto border-b border-white/10">
      {TICKET_TABS.map(({ key, label }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={key === "upcoming" ? "/dashboard/tickets" : `/dashboard/tickets?tab=${key}`}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
              isActive ? "border-teal-400 text-teal-300" : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {label}
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px]">{counts[key]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

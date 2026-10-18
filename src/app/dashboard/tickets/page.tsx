import Link from "next/link";
import TicketList from "@/components/tickets/TicketList";
import TicketStats from "@/components/tickets/TicketStats";
import TicketTabs from "@/components/tickets/TicketTabs";
import TicketsError from "@/components/tickets/TicketsError";
import { getMyTickets, groupTickets, isTicketTab, type TicketGroups, type TicketTab } from "@/lib/tickets";

export default async function AttendeeTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: TicketTab = isTicketTab(tab) ? tab : "upcoming";

  let groups: TicketGroups | null = null;
  try {
    groups = groupTickets(await getMyTickets());
  } catch {
    groups = null; // shows the error state below
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">Tickets &amp; Passes</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">My Tickets</h1>
          <p className="mt-1 text-sm text-slate-500">Open a ticket to show its digital pass at the event gate.</p>
        </div>
        <Link
          href="/events"
          className="rounded-lg bg-teal-500 px-3.5 py-2 text-xs font-medium text-slate-950 transition hover:bg-teal-400"
        >
          Find More Events
        </Link>
      </div>

      {groups ? (
        <>
          <TicketStats groups={groups} />
          <TicketTabs
            active={activeTab}
            counts={{
              upcoming: groups.upcoming.length,
              past: groups.past.length,
              cancelled: groups.cancelled.length,
            }}
          />
          <TicketList tickets={groups[activeTab]} tab={activeTab} />
        </>
      ) : (
        <TicketsError />
      )}
    </div>
  );
}

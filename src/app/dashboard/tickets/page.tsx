import Link from "next/link";
import { Plus } from "lucide-react";
import TicketsView from "@/components/tickets/TicketsView";
import { getMyTickets, isTicketTab, type MyTicket, type TicketTab } from "@/lib/tickets";

export default async function AttendeeTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: TicketTab = isTicketTab(tab) ? tab : "upcoming";

  let tickets: MyTicket[] | null = null;
  try {
    tickets = await getMyTickets();
  } catch {
    tickets = null; // shows the error state
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">Tickets &amp; Passes</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">My Tickets</h1>
          <p className="mt-1 text-sm text-slate-400">
            Show your official digital QR code pass at the event gate for entrance.
          </p>
        </div>

        <Link
          href="/dashboard/buy-tickets"
          className="flex items-center gap-1.5 self-start rounded-lg bg-teal-500 px-4 py-2.5 text-xs font-medium text-slate-950 transition hover:bg-teal-400 sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Buy Tickets</span>
        </Link>
      </div>

      <TicketsView tickets={tickets} activeTab={activeTab} />
    </div>
  );
}

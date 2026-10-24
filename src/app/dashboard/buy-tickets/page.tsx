import { getEvents } from "@/lib/events-api";
import type { EventDetails } from "@/types/event";
import type { Metadata } from "next";
import InteractiveTicketFlow, { type BookingAttendee } from "@/components/booking/InteractiveTicketFlow";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";
import { currentServerAccount } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Buy Tickets & Seat Selection | Aventix Attendee",
  description:
    "Select event performance details, ticket tiers, interactive numbered seats, and receive your digital e-ticket.",
};

export default async function BuyTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; category?: string }>;
}) {
  const { eventId, category } = await searchParams;
  let events: EventDetails[] = [];
  let eventsUnavailable = false;
  try {
    events = (await getEvents()).filter((event) =>
      event.status === "PUBLISHED" && event.categories.some((category) =>
        category.status === "ACTIVE" &&
        category.availability !== "SOLD_OUT" &&
        category.availability !== "SALE_ENDED" &&
        category.remaining !== 0
      )
    );
  } catch {
    eventsUnavailable = true;
  }
  let attendeeName: string | null = null;
  let attendee: BookingAttendee | null = null;
  try {
    const session = await currentServerAccount();
    if (session?.role === "ATTENDEE") {
      attendeeName = session.displayName;
      attendee = { userId: session.userId, name: session.displayName, email: session.email ?? "", phoneNumber: session.phoneNumber ?? null };
    }
  } catch {
    // The ticket flow can still render while account verification is unavailable.
  }

  return (
    <div className="flex min-h-screen bg-[#0B0F19]">
      <DashboardSidebar showSignOut={attendeeName !== null} />
      <div className="min-w-0 flex-1">
        <DashboardTopbar attendeeName={attendeeName} />
        <main id="main-content" className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {eventsUnavailable ? (
              <p role="alert" className="rounded-xl border border-white/10 bg-[#111622] p-6 text-slate-300">
                Concert details could not be loaded. Please refresh the page to try again.
              </p>
            ) : (
              <InteractiveTicketFlow
                events={events}
                attendee={attendee}
                initialEventId={eventId}
                initialCategory={category}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

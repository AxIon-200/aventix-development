import type { Metadata } from "next";
import InteractiveTicketFlow from "@/components/booking/InteractiveTicketFlow";
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
  let attendeeName: string | null = null;
  try {
    const session = await currentServerAccount();
    if (session?.role === "ATTENDEE") attendeeName = session.displayName;
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
            <InteractiveTicketFlow
              initialEventId={eventId}
              initialCategory={category}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

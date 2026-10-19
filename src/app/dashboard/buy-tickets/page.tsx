import type { Metadata } from "next";
import InteractiveTicketFlow from "@/components/booking/InteractiveTicketFlow";

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

  return (
    <div className="mx-auto max-w-6xl">
      <InteractiveTicketFlow
        initialEventId={eventId}
        initialCategory={category}
      />
    </div>
  );
}
